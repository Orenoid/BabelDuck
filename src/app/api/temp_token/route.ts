import { NextResponse } from "next/server";

export async function GET() {
    try {
        // 从环境变量获取 token
        const token = process.env.TEMP_SILICONFLOW_TOKEN;
        console.log("Reading token from env...");

        if (!token) {
            return NextResponse.json(
                { error: "Token not found" },
                { status: 404 }
            );
        }
        return NextResponse.json({ token });
    } catch (error) {
        console.error("Error getting token:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
} 