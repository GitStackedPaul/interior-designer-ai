import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function toFile(base64: string, name: string): File {
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(data, "base64");
  return new File([buffer], name, { type: "image/png" });
}

export async function POST(request: Request) {
  const req = await request.json();
  const { image, composite, theme, room, items, itemImages } = req;
  const itemList: { description: string; colorName: string }[] = Array.isArray(
    items
  )
    ? items
    : [];
  const itemImageList: string[] = Array.isArray(itemImages) ? itemImages : [];

  if (!image || !theme || !room) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Image 1: room with colored marker drawings
  const imageToSend = composite && composite !== image ? composite : image;
  const imageFiles: File[] = [toFile(imageToSend, "room.png")];

  // Images 2…N: the actual item reference photos
  itemImageList.forEach((img, i) => {
    imageFiles.push(toFile(img, `item_${i + 1}.png`));
  });

  // Build per-item placement instructions referencing each image by position
  const itemNotes =
    itemList.length > 0
      ? ` Items to place: ${itemList
          .map((item, i) => {
            const desc = item.description || "item";
            const imageRef = itemImageList[i]
              ? ` (use the exact item shown in image ${i + 2})`
              : "";
            return `${desc}${imageRef} → place in the ${item.colorName}-marked area`;
          })
          .join("; ")}.`
      : "";

  // room/theme injection disabled — values preserved for future re-enable
  // `Redesign this ${room} in ${theme} style. `
  const prompt =
    `Redesign this room. Image 1 shows the room with colored marker areas drawn on it. ` +
    (itemImageList.length > 0
      ? `Images 2 through ${itemImageList.length + 1} are reference photos of the exact furniture items to place. `
      : "") +
    `STRICT RULES - follow all of these without exception: ` +
    `(1) Colored marker strokes on image 1 indicate exactly where each item should be placed.${itemNotes} ` +
    `(2) Reproduce each item's exact appearance — color, material, shape, and style — as shown in its reference image. Do not substitute or invent a different version. ` +
    `(3) Preserve the room's original architecture, layout, walls, floors, windows, doors, and structural elements exactly as they appear - do not alter, remove, or rearrange them. ` +
    `(4) Do not add anything that was not explicitly instructed. ` +
    `High quality, photorealistic, editorial style photo, 4k.`;

  console.log("\n--- GENERATE REQUEST ---");
  console.log(
    "Images sent:",
    imageFiles.map((f) => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`)
  );
  console.log("Prompt:\n", prompt);
  console.log("------------------------\n");

  try {
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const b64Image = response.data?.[0]?.b64_json;
    if (!b64Image) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { output: [`data:image/png;base64,${b64Image}`] },
      { status: 201 }
    );
  } catch (err) {
    console.error("OpenAI error:", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
