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
  const { image, composite, theme, room, itemDescriptions } = req;
  const descriptions: string[] = Array.isArray(itemDescriptions)
    ? itemDescriptions
    : [];

  if (!image || !theme || !room) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const roomFile = toFile(image, "room.png");
  const imageFiles: File[] = [roomFile];

  if (composite && composite !== image) {
    imageFiles.push(toFile(composite, "composite.png"));
  }

  const placementNotes =
    descriptions.length > 0
      ? ` Placement notes: ${descriptions.map((d, i) => `Item ${i + 1}: ${d}`).join("; ")}.`
      : "";

  const prompt = `Redesign this ${room} in ${theme} style. The second image shows furniture items placed at their intended positions in the room — incorporate those furniture pieces into the redesign at the indicated positions.${placementNotes} High quality, photorealistic, editorial style photo, 4k.`;

  try {
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const b64Image = response.data[0]?.b64_json;
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
