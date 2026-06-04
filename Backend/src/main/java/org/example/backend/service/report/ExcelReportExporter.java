package org.example.backend.service.report;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.example.backend.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Sinh file Excel (.xlsx) cho các báo cáo M10 bằng Apache POI.
 * Tách khỏi Service nghiệp vụ để tái sử dụng cho nhiều loại báo cáo.
 */
@Component
public class ExcelReportExporter {

    /**
     * Xuất một bảng báo cáo dạng bảng đơn giản ra mảng byte .xlsx.
     *
     * @param sheetName tên sheet
     * @param title     tiêu đề in đậm ở dòng đầu
     * @param metaLines các dòng thông tin chung (vd: "Đợt thu: ...", "Ngày xuất: ...")
     * @param headers   tiêu đề cột
     * @param rows      dữ liệu, mỗi phần tử là một dòng đã được định dạng sẵn ra chuỗi
     */
    public byte[] export(String sheetName,
                         String title,
                         List<String> metaLines,
                         List<String> headers,
                         List<List<String>> rows) {

        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet(sheetName == null ? "Báo cáo" : sheetName);

            CellStyle titleStyle = wb.createCellStyle();
            Font titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);

            CellStyle metaStyle = wb.createCellStyle();
            Font metaFont = wb.createFont();
            metaFont.setItalic(true);
            metaStyle.setFont(metaFont);

            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle cellStyle = wb.createCellStyle();
            cellStyle.setBorderBottom(BorderStyle.THIN);
            cellStyle.setBorderTop(BorderStyle.THIN);
            cellStyle.setBorderLeft(BorderStyle.THIN);
            cellStyle.setBorderRight(BorderStyle.THIN);

            int rowIdx = 0;
            int colCount = headers.size();

            // Tiêu đề
            Row titleRow = sheet.createRow(rowIdx++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(title);
            titleCell.setCellStyle(titleStyle);
            if (colCount > 1) {
                sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, colCount - 1));
            }

            // Dòng thông tin chung
            if (metaLines != null) {
                for (String meta : metaLines) {
                    Row metaRow = sheet.createRow(rowIdx++);
                    Cell c = metaRow.createCell(0);
                    c.setCellValue(meta);
                    c.setCellStyle(metaStyle);
                    if (colCount > 1) {
                        sheet.addMergedRegion(
                                new CellRangeAddress(metaRow.getRowNum(), metaRow.getRowNum(), 0, colCount - 1));
                    }
                }
            }

            rowIdx++; // dòng trống ngăn cách

            // Header
            Row headerRow = sheet.createRow(rowIdx++);
            for (int i = 0; i < colCount; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers.get(i));
                c.setCellStyle(headerStyle);
            }

            // Dữ liệu
            for (List<String> dataRow : rows) {
                Row row = sheet.createRow(rowIdx++);
                for (int i = 0; i < colCount; i++) {
                    Cell c = row.createCell(i);
                    c.setCellValue(i < dataRow.size() ? dataRow.get(i) : "");
                    c.setCellStyle(cellStyle);
                }
            }

            for (int i = 0; i < colCount; i++) {
                sheet.autoSizeColumn(i);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new BadRequestException("EXPORT_FAILED",
                    "Không thể tạo file Excel: " + e.getMessage());
        }
    }
}
