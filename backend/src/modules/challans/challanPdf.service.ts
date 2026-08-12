import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { getChallanById } from "./challans.service";

type ChallanForPdf = Awaited<ReturnType<typeof getChallanById>>;

const PAGE_MARGIN = 48;
const PAGE_BOTTOM = 794;
const NAVY = "#10243E";
const CYAN = "#00A9CE";
const INK = "#1B2533";
const MUTED = "#64748B";
const BORDER = "#D8E0E8";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));
}

function drawLabel(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text(label.toUpperCase(), x, y, { width });
  doc.font("Helvetica").fontSize(10).fillColor(INK).text(value, x, y + 12, { width });
}

function drawItemsHeader(doc: PDFKit.PDFDocument, y: number) {
  const columns = { sku: 48, product: 138, qty: 358, price: 423, total: 502 };
  doc.rect(PAGE_MARGIN, y, 499, 22).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
  doc.text("SKU", columns.sku + 8, y + 7, { width: 74 });
  doc.text("PRODUCT", columns.product + 8, y + 7, { width: 204 });
  doc.text("QTY", columns.qty, y + 7, { width: 52, align: "right" });
  doc.text("UNIT PRICE", columns.price, y + 7, { width: 68, align: "right" });
  doc.text("LINE TOTAL", columns.total, y + 7, { width: 68, align: "right" });
  return y + 22;
}

function startItemsPage(doc: PDFKit.PDFDocument) {
  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(15).fillColor(NAVY).text("Sales Delivery Challan", PAGE_MARGIN, 48);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Continued line items", PAGE_MARGIN, 68);
  return drawItemsHeader(doc, 96);
}

/** Streams a printable A4 delivery challan without persisting a file to disk. */
export function streamChallanPdf(res: Response, challan: ChallanForPdf): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true, info: { Title: challan.challanNumber } });
    doc.on("error", reject);
    res.on("error", reject);
    res.on("finish", resolve);
    doc.pipe(res);

    try {
      doc.rect(0, 0, 595, 116).fill(NAVY);
      doc.rect(0, 112, 595, 4).fill(CYAN);
      doc.font("Helvetica-Bold").fontSize(24).fillColor("#FFFFFF").text("M/ERP", PAGE_MARGIN, 42);
      doc.font("Helvetica").fontSize(10).fillColor("#B7D9E6").text("OPERATIONS PORTAL", PAGE_MARGIN, 72);
      doc.font("Helvetica-Bold").fontSize(15).fillColor("#FFFFFF").text("SALES DELIVERY CHALLAN", 310, 44, { width: 237, align: "right" });
      doc.font("Helvetica").fontSize(9).fillColor("#B7D9E6").text(challan.challanNumber, 310, 68, { width: 237, align: "right" });

      let y = 144;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text("CHALLAN INFORMATION", PAGE_MARGIN, y);
      y += 22;
      drawLabel(doc, "Challan no.", challan.challanNumber, 48, y, 145);
      drawLabel(doc, "Status", challan.status, 215, y, 115);
      drawLabel(doc, "Created date", formatDate(challan.createdAt), 370, y, 177);
      y += 50;

      doc.roundedRect(PAGE_MARGIN, y, 499, 129, 3).fillAndStroke("#F8FAFC", BORDER);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text("CUSTOMER", 62, y + 15);
      const customer = challan.customer;
      drawLabel(doc, "Customer", customer?.name ?? "—", 62, y + 36, 180);
      drawLabel(doc, "Business", customer?.businessName ?? "—", 252, y + 36, 140);
      drawLabel(doc, "Phone", customer?.mobile ?? "—", 402, y + 36, 125);
      drawLabel(doc, "Email", customer?.email ?? "—", 62, y + 77, 180);
      drawLabel(doc, "Address", customer?.address ?? "—", 252, y + 77, 275);
      y += 157;

      doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text("ITEMS", PAGE_MARGIN, y);
      y = drawItemsHeader(doc, y + 12);

      const columns = { sku: 48, product: 138, qty: 358, price: 423, total: 502 };
      for (const item of challan.items) {
        const productHeight = doc.font("Helvetica").fontSize(9).heightOfString(item.productNameSnapshot, { width: 196, lineGap: 2 });
        const rowHeight = Math.max(32, productHeight + 14);
        if (y + rowHeight > PAGE_BOTTOM - 120) y = startItemsPage(doc);

        doc.rect(PAGE_MARGIN, y, 499, rowHeight).fillAndStroke("#FFFFFF", BORDER);
        doc.font("Helvetica").fontSize(8.5).fillColor(INK).text(item.skuSnapshot, columns.sku + 8, y + 10, { width: 74 });
        doc.font("Helvetica").fontSize(9).fillColor(INK).text(item.productNameSnapshot, columns.product + 8, y + 9, { width: 196, lineGap: 2 });
        doc.text(String(item.quantity), columns.qty, y + 10, { width: 52, align: "right" });
        doc.text(formatCurrency(item.unitPriceSnapshot), columns.price - 8, y + 10, { width: 76, align: "right" });
        doc.font("Helvetica-Bold").text(formatCurrency(item.lineTotal), columns.total - 8, y + 10, { width: 76, align: "right" });
        y += rowHeight;
      }

      const totalValue = challan.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
      if (y + 144 > PAGE_BOTTOM) y = startItemsPage(doc);
      y += 18;
      doc.roundedRect(310, y, 237, 59, 3).fillAndStroke("#F1F8FB", BORDER);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text("TOTAL QUANTITY", 324, y + 12);
      doc.text(String(challan.totalQuantity), 471, y + 12, { width: 60, align: "right" });
      doc.text("TOTAL VALUE", 324, y + 33);
      doc.text(formatCurrency(String(totalValue)), 417, y + 33, { width: 114, align: "right" });

      y += 94;
      doc.moveTo(365, y + 35).lineTo(547, y + 35).strokeColor(BORDER).stroke();
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Authorized signature", 365, y + 43, { width: 182, align: "center" });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text("M/ERP", PAGE_MARGIN, y + 43);
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text("This is a system-generated sales delivery challan.", PAGE_MARGIN, y + 57);

      const range = doc.bufferedPageRange();
      for (let page = 0; page < range.count; page += 1) {
        doc.switchToPage(page);
        doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(`Page ${page + 1} of ${range.count}`, PAGE_MARGIN, 810, { width: 499, align: "right" });
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
