export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const timestamp = Math.round(Date.now() / 1000);

    const signatureData =
        `timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(signatureData);

    const hash = await crypto.subtle.digest("SHA-1", data);

    const signature = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    res.status(200).json({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature
    });
}
