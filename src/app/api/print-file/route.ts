import { NextResponse } from "next/server";

// Server-side print-file generation API
// Accepts artwork_json and returns a downloadable JSON manifest
// (In production, this would render to PDF/PNG using a headless browser or canvas library)
export async function POST(req: Request) {
  try {
    const { orderId, elements, productType } = await req.json();

    if (!orderId || !elements) {
      return NextResponse.json({ error: "orderId and elements are required" }, { status: 400 });
    }

    // Build a structured print manifest (Xero-ready, production-ready)
    const manifest = {
      orderId,
      productType: productType || "custom",
      generatedAt: new Date().toISOString(),
      version: "1.0",
      fileNamingConvention: `${orderId}_${productType || "Custom"}_${new Date().toISOString().split("T")[0]}_Output`,
      artworkElements: elements,
      elementCount: Array.isArray(elements) ? elements.length : 0,
      printSpecs: {
        resolution: "300dpi",
        colorSpace: "CMYK",
        bleed: "3mm",
        format: "PDF/PNG",
      },
      xeroReady: {
        orderId,
        lineItems: [{ description: productType || "Custom Print Job", quantity: 1 }],
        currency: "GBP",
        status: "DRAFT",
      },
    };

    // Return as downloadable JSON (in a real implementation, would return a PDF blob)
    return new NextResponse(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${manifest.fileNamingConvention}.json"`,
      },
    });
  } catch (error) {
    console.error("Print file generation error:", error);
    return NextResponse.json({ error: "Failed to generate print file" }, { status: 500 });
  }
}
