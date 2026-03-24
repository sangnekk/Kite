
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import moment from "moment-timezone"
import axios from "axios";
import { MBTransaction, MBTransactionResponse } from "../types/mbbank";

type LoginResponse = {
  sessionId: string;
  cust: {
    deviceId: string;
  };
  result: {
    responseCode: string;
  };
};

const REQUEST_TIMEOUT_MS = 30_000;
const CAPTCHA_TIMEOUT_MS = 20_000;
const MAX_RETRY = 2;
const RETRY_DELAY_MS = 1_000;
const MB_CAPTCHA_API_URL = process.env.MB_CAPTCHA_API_URL;
const MB_AUTHORIZATION = process.env.MB_AUTHORIZATION;
const MB_BASE_URL = process.env.MB_BASE_URL;
const LOGIN_DIR = path.join(__dirname, "/temp/login_data.json");
const TRANSACTION_TEMP_DIR = path.join(__dirname, "/temp/transaction_data.json");

function saveTempLoginData(data: any) {
  fs.mkdirSync(path.dirname(LOGIN_DIR), { recursive: true });
  fs.writeFileSync(LOGIN_DIR, JSON.stringify(data, null, 2));
}

function loadTempLoginData(): any {
  if (fs.existsSync(LOGIN_DIR)) {
    return JSON.parse(fs.readFileSync(LOGIN_DIR, "utf-8"));
  }
  return null;
}

function saveTransactionTempData(data: any) {
  fs.mkdirSync(path.dirname(TRANSACTION_TEMP_DIR), { recursive: true });
  fs.writeFileSync(TRANSACTION_TEMP_DIR, JSON.stringify(data, null, 2));
}

function loadTransactionTempData(): any {
  if (fs.existsSync(TRANSACTION_TEMP_DIR)) {
    return JSON.parse(fs.readFileSync(TRANSACTION_TEMP_DIR, "utf-8"));
  }
  return null;
}

let tempLoginData: { loginResult: LoginResponse; responseData?: MBTransactionResponse } | null = loadTempLoginData();
let transactionTempData: MBTransactionResponse | null = loadTransactionTempData();

function validateCredentials(username: string, password: string, accountNumber?: string) {
  if (!username || username.length > 50) {
    throw new Error("MB username không hợp lệ.");
  }

  if (!password || password.length > 100) {
    throw new Error("MB password không hợp lệ.");
  }

  if (accountNumber && !/^\d{8,20}$/.test(accountNumber)) {
    throw new Error("Số tài khoản không hợp lệ.");
  }
}

function isLoginSuccess(result: unknown): result is LoginResponse {
  return Boolean(
    result &&
    typeof result === "object" &&
    (result as LoginResponse).sessionId &&
    (result as LoginResponse).cust?.deviceId &&
    (result as LoginResponse).result?.responseCode === "00"
  );
}

function isTransactionResponse(data: unknown): data is MBTransactionResponse {
  return Boolean(
    data &&
    typeof data === "object" &&
    (data as MBTransactionResponse).result?.ok !== undefined &&
    Array.isArray((data as MBTransactionResponse).transactionHistoryList)
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries: number, retryDelayMs: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function login(username: string, password: string) {
  validateCredentials(username, password);

  if (!MB_CAPTCHA_API_URL) {
    throw new Error("Thiếu biến môi trường MB_CAPTCHA_API_URL.");
  }

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

  try {
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto(`https://${MB_BASE_URL}/pl/login?returnUrl=%2F`, {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector('img[src^="data:image/png;base64,"]', { timeout: 30000 });

    const captchaBase64 = await page.evaluate(() => {
      const img = document.querySelector('img[src^="data:image/png;base64,"]');
      return img instanceof HTMLImageElement ? img.src : null;
    });

    if (!captchaBase64) throw new Error("Không tìm thấy ảnh CAPTCHA.");

    const base64 = captchaBase64.replace(/^data:image\/png;base64,/, "");
    const captchaSolution = await solveCaptcha(MB_CAPTCHA_API_URL, base64);
    if (!captchaSolution) throw new Error("Không thể giải CAPTCHA.");

    await page.type("#user-id", username);
    await page.type("#new-password", password);
    await page.type('input[placeholder="NHẬP MÃ KIỂM TRA"]', captchaSolution);

    const loginResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/doLogin"),
      { timeout: REQUEST_TIMEOUT_MS }
    );

    await page.click("#login-btn");
    const loginResponse = await loginResponsePromise;

    if (loginResponse.status() !== 200) {
      throw new Error(`Đăng nhập thất bại, HTTP ${loginResponse.status()}`);
    }

    const result = (await loginResponse.json()) as LoginResponse;

    if (isLoginSuccess(result)) {
      saveTempLoginData({ loginResult: result });
      return result;
    }

    return null;
  } catch (error: any) {
    console.error("Lỗi đăng nhập MB:", error?.message || error);
    return null;
  } finally {
    await browser.close();
  }
}

async function lsgd(username: string, password: string, account_number: string) {
  validateCredentials(username, password, account_number);

  if (!MB_AUTHORIZATION) {
    throw new Error("Thiếu biến môi trường MB_AUTHORIZATION.");
  }

  const time = moment.tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss") + "00";
  const result = tempLoginData ? tempLoginData.loginResult : await login(username, password);
  if (result && isLoginSuccess(result)) {
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
      url: `https://${MB_BASE_URL}/api/retail-transactionms/transactionms/get-account-transaction-history`,
      headers: {
        app: "MB_WEB",
        Authorization: MB_AUTHORIZATION,
        Deviceid: result.cust.deviceId,
        Host: `${MB_BASE_URL}`,
        Origin: `https://${MB_BASE_URL}`,
        Referer: `https://${MB_BASE_URL}/information-account/source-account`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Refno: `${account_number}-${time}`,
        "X-Request-Id": `${account_number}-${time}`,
      },
      data: data,
      timeout: REQUEST_TIMEOUT_MS,
    };

    try {
      const response = await withRetry(
        async () => axios.request(config),
        MAX_RETRY,
        RETRY_DELAY_MS
      );

      const responseData = response.data;

      if (isTransactionResponse(responseData) && responseData.result.ok) {
        tempLoginData = { loginResult: result, responseData };
        saveTempLoginData(tempLoginData);
        return responseData;
      } else {
        console.error("Dữ liệu không hợp lệ, yêu cầu đăng nhập lại.");
        tempLoginData = null;
        saveTempLoginData(tempLoginData);
        return null;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Lỗi khi lấy dữ liệu giao dịch:", message);
      return null;
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
    const response = await withRetry(
      async () => axios.post(apiUrl, {
        base64: base64Image,
      }, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: CAPTCHA_TIMEOUT_MS,
      }),
      MAX_RETRY,
      RETRY_DELAY_MS
    );

    const result = response.data;

    if (result && result.captcha) {
      return result.captcha;
    } else {
      console.error("Lỗi khi giải CAPTCHA: Không nhận được kết quả hợp lệ.");
      return null;
    }
  } catch (error: any) {
    console.error("Lỗi khi giải CAPTCHA:", error.message);
    return null;
  }
}

let isInRetry: NodeJS.Timeout | null = null;
export const get_data = async (username: string, password: string, accountNumber: string, update: boolean = false): Promise<MBTransactionResponse | null> => {
  try {
    if (!update && transactionTempData && isTransactionResponse(transactionTempData)) {
      // Tránh Spam, trả dữ liệu được cập nhật bởi cron
      return transactionTempData;
    }
    const newResult = await lsgd(username, password, accountNumber);
    if (newResult && isTransactionResponse(newResult)) {
      saveTransactionTempData(newResult);
      transactionTempData = newResult;
      return newResult;
    } else {
      if (isInRetry) {
        return null; // Đang trong quá trình retry, tránh gọi lsgd nhiều lần
      }
      isInRetry = setTimeout( async () => {
        return await get_data(username, password, accountNumber, update);
      }, 15000)

      return null;
    }
  } catch (error: any) {
    console.error("Lỗi trong quá trình cập nhật dữ liệu:", error.message);
    throw error; // Throw lại để phân biệt với state relogin
  }
}

export const get_new_transactions = async (username: string, password: string, accountNumber: string): Promise<MBTransaction[]> => {

  try {
    const previousTransactions = transactionTempData?.transactionHistoryList ?? [];

    const newResult = await get_data(username, password, accountNumber, true);
    if (newResult && newResult.transactionHistoryList) {
      const previousRefs = new Set(previousTransactions.map((tx) => tx.refNo));
      const newTransactions = newResult.transactionHistoryList.filter(tx => {
        const isNew = !previousRefs.has(tx.refNo) && Number(tx.creditAmount) > 0; // Chỉ lấy giao dịch mới có số tiền vào
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
