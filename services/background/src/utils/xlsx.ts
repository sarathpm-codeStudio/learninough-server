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
