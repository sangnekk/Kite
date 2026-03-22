import { Elysia } from "elysia";
import { get_data } from "./module/mbbank";
import { config } from "dotenv";
config();
const app = new Elysia().get("/", () => "Hello Elysia").listen(3000);

const USERNAME = process.env.MB_USERNAME;
const PASSWORD = process.env.MB_PASSWORD;
const ACCOUNT_NUMBER = process.env.MB_ACCOUNT;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

app.get("/check", async () => {
  
  try {
    const data = await get_data(USERNAME!, PASSWORD!, ACCOUNT_NUMBER!);
    if (data) {
      return data;
    } else {
      return { error: "Không thể lấy dữ liệu, vui lòng thử lại sau." };
    }
  } catch (error: any) {
    console.error("Lỗi khi xử lý yêu cầu /check:", error.message);
    return { error: "Đã xảy ra lỗi khi xử lý yêu cầu." };
  }
})

app.on("start", async () => {
  // Startup event ở đây

})


console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
