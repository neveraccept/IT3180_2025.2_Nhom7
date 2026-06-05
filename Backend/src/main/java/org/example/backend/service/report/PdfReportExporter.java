package org.example.backend.service.report;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.example.backend.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.List;

/**
 * Sinh file PDF cho các báo cáo M10 bằng OpenPDF (com.lowagie.text).
 *
 * Lưu ý tiếng Việt: PDF cần font Unicode nhúng (IDENTITY_H) mới hiển thị đúng dấu.
 * Exporter ưu tiên nạp font ở classpath {@code /fonts/DejaVuSans.ttf}; nếu không có
 * sẽ thử một vài font hệ thống phổ biến, cuối cùng fallback về Helvetica
 * (mất dấu tiếng Việt). Nên đặt DejaVuSans.ttf vào {@code src/main/resources/fonts}.
 */
@Component
public class PdfReportExporter {

    public byte[] export(String title,
                         List<String> metaLines,
                         List<String> headers,
                         List<List<String>> rows) {

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            BaseFont baseFont = resolveBaseFont();
            Font titleFont = new Font(baseFont, 16, Font.BOLD);
            Font metaFont = new Font(baseFont, 10, Font.ITALIC, Color.DARK_GRAY);
            Font headerFont = new Font(baseFont, 10, Font.BOLD, Color.WHITE);
            Font cellFont = new Font(baseFont, 10, Font.NORMAL);

            Paragraph titlePara = new Paragraph(title, titleFont);
            titlePara.setAlignment(Element.ALIGN_CENTER);
            titlePara.setSpacingAfter(10f);
            document.add(titlePara);

            if (metaLines != null) {
                for (String meta : metaLines) {
                    Paragraph p = new Paragraph(meta, metaFont);
                    document.add(p);
                }
            }
            document.add(new Paragraph(" ", metaFont));

            PdfPTable table = new PdfPTable(headers.size());
            table.setWidthPercentage(100);

            Color headerBg = new Color(60, 90, 150);
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(headerBg);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(5f);
                table.addCell(cell);
            }

            for (List<String> dataRow : rows) {
                for (int i = 0; i < headers.size(); i++) {
                    String value = i < dataRow.size() ? dataRow.get(i) : "";
                    PdfPCell cell = new PdfPCell(new Phrase(value, cellFont));
                    cell.setPadding(4f);
                    table.addCell(cell);
                }
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new BadRequestException("EXPORT_FAILED",
                    "Không thể tạo file PDF: " + e.getMessage());
        }
    }

    /** Nạp font Unicode để hiển thị tiếng Việt; fallback Helvetica nếu không có. */
    private BaseFont resolveBaseFont() throws Exception {
        // 1) Font đóng gói trong classpath
        try (InputStream is = getClass().getResourceAsStream("/fonts/DejaVuSans.ttf")) {
            if (is != null) {
                byte[] bytes = is.readAllBytes();
                return BaseFont.createFont("DejaVuSans.ttf", BaseFont.IDENTITY_H,
                        BaseFont.EMBEDDED, true, bytes, null);
            }
        }
        // 2) Một số font hệ thống thường gặp
        String[] candidates = {
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/dejavu/DejaVuSans.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "/Library/Fonts/Arial.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf"
        };
        for (String path : candidates) {
            if (new File(path).exists()) {
                return BaseFont.createFont(path, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            }
        }
        // 3) Fallback (mất dấu tiếng Việt)
        return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
    }
}
