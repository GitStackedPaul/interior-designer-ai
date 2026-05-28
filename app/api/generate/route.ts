import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const req = await request.json();
  const { image, theme, room } = req;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Convert base64 data URL to File for the OpenAI images.edit endpoint
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");
  const imageFile = new File([imageBuffer], "room.png", { type: "image/png" });

  const prompt = `Transform this ${room} into a ${theme} style interior design. High quality, photorealistic, editorial style photo, symmetry, natural light, 4k, award-winning interior photography`;

  try {
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
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
