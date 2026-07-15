// xlsx.ts — build real .xlsx workbooks with exceljs

import ExcelJS from "exceljs";

/**
 * Serialize an array of rows into an .xlsx workbook buffer.
 *
 * @param rows    Array of objects to write.
 * @param columns Column definitions controlling order, header labels and width.
 * @param sheet   Worksheet name.
 */
export const toXlsxBuffer = async <T extends Record<string, any>>(
    rows: T[],
    columns: { key: keyof T | string; header: string; width?: number }[],
    sheet: string = "Sheet1"
): Promise<Buffer> => {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheet);

    worksheet.columns = columns.map((c) => ({
        header: c.header,
        key: String(c.key),
        width: c.width ?? 20,
    }));

    // Bold header row.
    worksheet.getRow(1).font = { bold: true };

    rows.forEach((row) => worksheet.addRow(row));

    const arrayBuffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(arrayBuffer);
};

/** Normalize a header label so "Option A", "option_a" and "OPTIONA" all match. */
const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * ExcelJS cell values are a union — plain scalars, rich text, formula results,
 * hyperlinks. Flatten any of them to trimmed plain text.
 */
export const cellText = (value: any): string => {

    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value.richText)) return value.richText.map((part: any) => part.text).join("").trim();
    if (value.result !== undefined) return String(value.result).trim();
    if (value.text) return String(value.text).trim();
    if (value.hyperlink) return String(value.hyperlink).trim();

    return String(value).trim();
};

/**
 * Read an uploaded .xlsx buffer into plain row objects keyed by the given columns.
 *
 * Columns are matched by HEADER NAME, not position, so a reordered sheet still
 * imports. Fully blank rows are skipped. Each row carries the 1-based `rowNumber`
 * from the sheet so errors can be reported against what the user actually sees.
 *
 * @throws if a required header is missing or the buffer isn't a readable workbook.
 */
export const parseXlsxBuffer = async (
    buffer: Buffer,
    columns: { key: string; header: string }[],
    sheet?: string,
    maxRows: number = 500
): Promise<Record<string, any>[]> => {

    const workbook = new ExcelJS.Workbook();

    try {
        await workbook.xlsx.load(buffer as any);
    } catch {
        throw new Error("The uploaded file could not be read. Please upload a valid .xlsx file.");
    }

    const worksheet = (sheet ? workbook.getWorksheet(sheet) : undefined) ?? workbook.worksheets[0];

    if (!worksheet) throw new Error("The uploaded workbook has no sheets.");

    // Map header label → column index from row 1.
    const columnIndexByHeader: Record<string, number> = {};

    worksheet.getRow(1).eachCell((cell, colNumber) => {
        columnIndexByHeader[normalizeHeader(cellText(cell.value))] = colNumber;
    });

    const missing = columns.filter((c) => !columnIndexByHeader[normalizeHeader(c.header)]);

    if (missing.length) {
        throw new Error(
            `Missing column${missing.length > 1 ? "s" : ""}: ${missing.map((c) => c.header).join(", ")}. Please use the sample template.`
        );
    }

    // Resolve each column to its concrete index once, now that they're known present.
    const resolved = columns.map((column) => ({
        key: column.key,
        index: columnIndexByHeader[normalizeHeader(column.header)] as number,
    }));

    const rows: Record<string, any>[] = [];

    worksheet.eachRow((row, rowNumber) => {

        if (rowNumber === 1 || rows.length >= maxRows) return;

        const parsed: Record<string, any> = { rowNumber };

        resolved.forEach((column) => {
            parsed[column.key] = cellText(row.getCell(column.index).value);
        });

        // Skip rows the user left entirely blank rather than reporting them as errors.
        const isBlank = resolved.every((column) => parsed[column.key] === "");

        if (!isBlank) rows.push(parsed);
    });

    return rows;
};

/**
 * Build a base64 API Gateway response the browser downloads as an .xlsx file.
 * Requires API Gateway binaryMediaTypes to be configured (e.g. the xlsx type or a wildcard).
 */
export const xlsxResponse = (buffer: Buffer, filename: string) => ({
    statusCode: 200,
    headers: {
        "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Access-Control-Allow-Origin": "*",
        // Cross-origin JS can't read Content-Disposition unless it's explicitly
        // exposed — without this the frontend can't pick up the filename.
        "Access-Control-Expose-Headers": "Content-Disposition",
    },
    isBase64Encoded: true,
    body: buffer.toString("base64"),
});
