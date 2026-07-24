
import ExcelJS from "exceljs";
import { facultyQuestionImportRepository } from "./question.repository";
import { parseXlsxBuffer } from "../../../utils/xlsx";
import { parseJsonBody } from "../../../../../../shared/utils/parseBody";


/** Every question is a 4-option MCQ with exactly one correct answer. */
const LABELS = ["A", "B", "C", "D"] as const;

/** Column keys the parser maps by header name — the template writes these same headers. */
const COLUMNS = [
    { key: "question", header: "Question", width: 55 },
    { key: "optionA", header: "Option A", width: 26 },
    { key: "optionB", header: "Option B", width: 26 },
    { key: "optionC", header: "Option C", width: 26 },
    { key: "optionD", header: "Option D", width: 26 },
    { key: "correctAnswer", header: "Correct Answer", width: 16 },
];

const SHEET = "Questions";

/** Cap the import so a stray 10k-row sheet can't blow the Lambda timeout. */
export const MAX_IMPORT_ROWS = 200;

const SAMPLE_ROWS = [
    ["Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Mercury", "B"],
    ["What is the chemical symbol for water?", "H2O", "CO2", "NaCl", "O2", "A"],
    ['Who wrote the play "Romeo and Juliet"?', "Charles Dickens", "Leo Tolstoy", "William Shakespeare", "Jane Austen", "C"],
];


/** Reject a row the faculty can't have meant — returns the reason, or null when valid. */
const validateRow = (row: Record<string, any>): string | null => {

    if (!row.question) return "Question text is empty";

    const missing = LABELS.filter((label) => !row[`option${label}`]);

    if (missing.length) return `Option ${missing.join(", ")} is empty`;

    if (!row.correctAnswer) return "Correct answer is empty";

    if (!(LABELS as readonly string[]).includes(row.correctAnswer.toUpperCase())) {
        return `Correct answer must be A, B, C or D (got "${row.correctAnswer}")`;
    }

    return null;
};


export const facultyQuestionImportService = {

    /**
     * Build the sample .xlsx faculty download before filling in their questions.
     * Ships an answer dropdown and an instructions sheet so the file comes back parseable.
     */
    buildTemplate: async (): Promise<{ buffer: Buffer; filename: string }> => {

        try {

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet(SHEET);

            sheet.columns = COLUMNS.map((column) => ({
                header: column.header,
                key: column.key,
                width: column.width,
            }));

            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.height = 24;
            headerRow.alignment = { vertical: "middle" };
            headerRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C1452" } };
            });

            SAMPLE_ROWS.forEach((row) => sheet.addRow(row));

            // Constrain the answer column so faculty can't invent their own labels.
            for (let rowNumber = 2; rowNumber <= MAX_IMPORT_ROWS + 1; rowNumber++) {
                sheet.getCell(`F${rowNumber}`).dataValidation = {
                    type: "list",
                    allowBlank: false,
                    formulae: ['"A,B,C,D"'],
                    showErrorMessage: true,
                    errorTitle: "Invalid answer",
                    error: "Correct Answer must be A, B, C or D.",
                };
            }

            const guide = workbook.addWorksheet("Instructions");
            guide.columns = [{ width: 100 }];
            guide.addRows([
                ["How to use this template"],
                [""],
                ['1. Fill one question per row on the "Questions" sheet. Do not rename or delete the header row.'],
                ["2. All four options (A, B, C, D) are required for every question."],
                ['3. "Correct Answer" must be the letter of the correct option — A, B, C or D.'],
                ["4. The three sample rows are examples. Delete them before uploading."],
                [`5. A maximum of ${MAX_IMPORT_ROWS} questions can be imported at a time.`],
                ["6. The module and material are chosen in the dashboard and applied to every imported question."],
            ]);
            guide.getRow(1).font = { bold: true, size: 13, color: { argb: "FF2C1452" } };

            const arrayBuffer = await workbook.xlsx.writeBuffer();

            return { buffer: Buffer.from(arrayBuffer), filename: "question-import-template.xlsx" };

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error);
        }
    },

    /**
     * Import an uploaded .xlsx of MCQs into a test.
     *
     * The workbook arrives base64-encoded inside a JSON body:
     *   { file: "<base64 xlsx>", moduleId?, materialId?, materialTitle? }
     *
     * Base64-in-JSON rather than a raw binary body on purpose: a raw body only
     * survives if the gateway base64-encodes it, which serverless-offline does NOT
     * do for incoming requests — the bytes get mangled by UTF-8 decoding. Base64 is
     * ASCII, so it round-trips identically offline and on real API Gateway.
     *
     * Invalid rows are skipped and reported rather than failing the whole upload —
     * one bad row shouldn't cost the faculty the other 199.
     */
    importTestQuestions: async (event: any) => {

        try {

            const testId = event.pathParameters?.testId;

            if (!testId) throw new Error("testId is required");

            const client = event.supabase;

            const test = await facultyQuestionImportRepository.getTest(testId, client);

            if (!test) throw new Error("Test not found");

            const body = parseJsonBody(event) ?? {};

            if (!body.file) throw new Error("No file was uploaded.");

            const rows = await parseXlsxBuffer(
                Buffer.from(body.file, "base64"),
                COLUMNS,
                SHEET,
                MAX_IMPORT_ROWS
            );

            if (!rows.length) throw new Error("No questions found in the uploaded file.");

            const skipped = rows
                .map((row) => ({ row: row.rowNumber, error: validateRow(row) }))
                .filter((entry): entry is { row: number; error: string } => entry.error !== null);

            const validRows = rows.filter((row) => validateRow(row) === null);

            if (!validRows.length) {
                throw new Error("No valid questions found — every row has an error. Please check the file and try again.");
            }

            // Fall back to the test's own placement when the caller doesn't override it.
            const moduleId = body.moduleId || test.folder_id || null;
            const materialId = body.materialId || test.material_id || null;
            const materialTitle = body.materialTitle || null;

            const questions = validRows.map((row) => ({
                question: row.question,
                module_id: moduleId,
                material_id: materialId,
                material_title: materialTitle,
                options: LABELS.map((label) => ({
                    label,
                    text: row[`option${label}`],
                    is_correct: row.correctAnswer.toUpperCase() === label,
                })),
            }));

            const lastQuestionNumber = await facultyQuestionImportRepository.getLastQuestionNumber(testId, client);
            const startNumber = lastQuestionNumber + 1;

            const inserted = await facultyQuestionImportRepository.bulkInsertQuestions(
                testId,
                questions,
                startNumber,
                client
            );

            await facultyQuestionImportRepository.updateQuestionCount(
                testId,
                startNumber + questions.length - 1,
                client
            );

            return {
                imported: inserted.length,
                skipped,
                total: rows.length,
            };

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error?.message || error);
        }
    },

}
