
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import moment from "moment-timezone"
import axios from "axios";
import { MBTransaction, MBTransactionResponse } from "../types/mbbank";


const LOGIN_DIR = path.join(__dirname, "/temp/login_data.json");
const TRANSACTION_TEMP_DIR = path.join(__dirname, "/temp/transaction_data.json");

function saveTempLoginData(data: any) {
  fs.writeFileSync(LOGIN_DIR, JSON.stringify(data, null, 2));
}

function loadTempLoginData(): any {
  if (fs.existsSync(LOGIN_DIR)) {
    return JSON.parse(fs.readFileSync(LOGIN_DIR, "utf-8"));
  }
  return null;
}

function saveTransactionTempData(data: any) {
  fs.writeFileSync(TRANSACTION_TEMP_DIR, JSON.stringify(data, null, 2));
}

function loadTransactionTempData(): any {
  if (fs.existsSync(TRANSACTION_TEMP_DIR)) {
    return JSON.parse(fs.readFileSync(TRANSACTION_TEMP_DIR, "utf-8"));
  }
  return null;
}

let tempLoginData = loadTempLoginData();
let transactionTempData = loadTransactionTempData();

async function login(username: string, password: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const page = await browser.newPage();
  let result;
  try {
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto("https://online.mbbank.com.vn/pl/login?returnUrl=%2F", {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector('img[src^="data:image/png;base64,"]', { timeout: 30000 });

    const captchaBase64 = await page.evaluate(() => {
      const img = document.querySelector('img[src^="data:image/png;base64,"]');
      // @ts-expect-error - TypeScript không nhận diện được thuộc tính src của HTMLImageElement
      return img ? img.src : null;
    });

    if (!captchaBase64) throw new Error("Không tìm thấy ảnh CAPTCHA.");

    const base64 = captchaBase64.replace(/^data:image\/png;base64,/, "");
    const captchaSolution = await solveCaptcha(
      "http://103.153.64.187:8277/api/captcha/mbbank",
      base64
    );
    if (!captchaSolution) throw new Error("Không thể giải CAPTCHA.");

    await page.type("#user-id", username);
    await page.type("#new-password", password);
    await page.type('input[placeholder="NHẬP MÃ KIỂM TRA"]', captchaSolution);

    page.on("response", async (response) => {
      if (
        response.url().includes("/doLogin") &&
        response.status() === 200
      ) {
        result = await response.json();
      }
    });

    await page.click("#login-btn");
  } catch (error: any) {
    console.error("Lỗi:", error.message);
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await browser.close();
    // @ts-expect-error - TypeScript không nhận diện được kiểu của result
    if (result && result.result && result.result.responseCode === "00") {
      saveTempLoginData({ loginResult: result });
    }
    return result;
  }
}

async function lsgd(username: string, password: string, account_number: string) {
  const time = moment.tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss") + "00";
  const result = tempLoginData ? tempLoginData.loginResult : await login(username, password);
  if (result && result.result && result.result.responseCode === "00") {
    let data = {
      accountNo: account_number,
      fromDate: moment().subtract(3, "days").format("DD/MM/YYYY"),
      toDate: moment().format("DD/MM/YYYY"),
      sessionId: result.sessionId,
      refNo: `${account_number}-${time}`,
      deviceIdCommon: result.cust.deviceId,
    };
    let config = {
      method: "post",
      url: "https://online.mbbank.com.vn/api/retail-transactionms/transactionms/get-account-transaction-history",
      headers: {
        app: "MB_WEB",
        Authorization: "Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm",
        Deviceid: result.cust.deviceId,
        Host: "online.mbbank.com.vn",
        Origin: "https://online.mbbank.com.vn",
        Referer: "https://online.mbbank.com.vn/information-account/source-account",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Refno: `${account_number}-${time}`,
        "X-Request-Id": `${account_number}-${time}`,
      },
      data: data,
    };

    try {
      const response = await axios.request(config);
      const responseData = response.data;
      if (responseData && responseData.result && responseData.result.ok) {
        tempLoginData = { loginResult: result, responseData };
        saveTempLoginData(tempLoginData);
        return responseData;
      } else {
        console.error("Dữ liệu không hợp lệ, yêu cầu đăng nhập lại.");
        tempLoginData = null;
        saveTempLoginData(tempLoginData);
        return null;
      }
    } catch (error: any) {
      console.log("Lỗi khi lấy dữ liệu, thử lại sau:", error.message);
      return false;
    }
  } else {
    console.error("Lỗi khi lấy dữ liệu, yêu cầu đăng nhập lại.");
    tempLoginData = null;
    saveTempLoginData(tempLoginData);
    return null;
  }
}

async function solveCaptcha(apiUrl: string, base64Image: string) {
  try {
    const response = await axios.post(apiUrl, {
      base64: base64Image,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = response.data;

    if (result && result.captcha) {
      console.log("CAPTCHA đã được giải:", result.captcha);
      return result.captcha;
    } else {
      console.error("Lỗi khi giải CAPTCHA: Không nhận được kết quả hợp lệ.", result);
      return null;
    }
  } catch (error: any) {
    console.error("Lỗi khi giải CAPTCHA:", error.message);
    return null;
  }
}

export const get_data = async (username: string, password: string, accountNumber: string): Promise<MBTransactionResponse | null> => {
  try {
    const newResult = await lsgd(username, password, accountNumber);
    if (newResult) {
      saveTransactionTempData(newResult);
      transactionTempData = newResult;
      return newResult
    } else {
      console.error("Đã đăng nhập lại...");
      return null;
    }
  } catch (error: any) {
    console.error("Lỗi trong quá trình cập nhật dữ liệu:", error.message);
    throw error; // Throw lại để phân biệt với state relogin
  }
}

export const get_new_transactions = async (username: string, password: string, accountNumber: string): Promise<MBTransaction[]> => {

  try {
    const newResult = await get_data(username, password, accountNumber);
    if (newResult && newResult.transactionHistoryList) {
      const newTransactions = newResult.transactionHistoryList.filter(tx => {
        const isNew = !transactionTempData || !transactionTempData.transactionHistoryList.some((oldTx: MBTransaction) => oldTx.refNo === tx.refNo);
        return isNew;
      });
      return newTransactions;
    } else {
      console.error("Không thể lấy dữ liệu, vui lòng thử lại sau.");
      return [];
    }
  }
  catch (error: any) {
    console.error("Lỗi khi xử lý yêu cầu lấy giao dịch mới:", error.message);
    throw error; // Throw lại để phân biệt với state lỗi
  }

}

// // Web server Express
// const app = express();

// (async () => {
//   const username = process.env.MB_USERNAME;
//   const password = process.env.MB_PASSWORD;
//   const accountNumber = process.env.MB_ACCOUNT;

//   let result;

//   async function updateData() {
//     try {
//       const newResult = await lsgd(username, password, accountNumber);
//       if (newResult) {
//         result = newResult;
//       } else {
//         console.error("Đã đăng nhập lại...");
//       }
//     } catch (error) {
//       console.error("Lỗi trong quá trình cập nhật dữ liệu:", error);
//     }
//   }

// setInterval(updateData, 60000); // mỗi 1 phút
//   await updateData();

//   app.get("/", (req, res) => {
//     res.send(`${JSON.stringify(result, null, 2)}`);
//   });

//   const PORT = 6868;
//   app.listen(PORT, () => {
//     console.log(`Server đang chạy trên http://localhost:${PORT}`);
//   });
// })();
