import { NextResponse } from "next/server";

// CSV variable-data merge API
// Used for race numbers and bulk jobs - generates one row per item
export async function POST(req: Request) {
  try {
    const { orderId, elements, qty, productType, fields } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const quantity = qty || 1;
    const productName = productType || "race-numbers";

    // Build CSV rows - one per unit (e.g. one race number per row)
    const headers = ["Row", "OrderID", "ProductType", "Number", "Name", "Category", "ArtworkRef", "PrintStatus"];
    
    const rows: string[][] = [];
    for (let i = 1; i <= quantity; i++) {
      rows.push([
        String(i),
        orderId,
        productName,
        String(i),                            // Variable: race number, bib number, etc.
        `Participant_${i}`,                    // Variable: name field
        "General",                            // Variable: category
        `${orderId}_${productName}_row_${i}`, // Artwork reference
        "PENDING",
      ]);
    }

    // Assemble CSV
    const csvLines = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(",")),
    ];
    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${orderId}_${productName}_variable_data.csv"`,
      },
    });
  } catch (error) {
    console.error("CSV merge error:", error);
    return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
  }
}
