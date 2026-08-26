import axios from "axios";

const api = axios.create({
  timeout: 15000
});

const safeError = (error: any, fallback: string) => {

  if (error?.response?.status === 429) {
    return "AI 요청 한도를 초과했습니다.";
  }

  if (error?.response?.status >= 500) {
    return "AI 서버가 일시적으로 응답하지 않습니다.";
  }

  if (
    error?.code === "ECONNABORTED" ||
    error?.message?.includes("timeout")
  ) {
    return "AI 응답 시간이 초과되었습니다.";
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const generateStrategyFromNL = async (
  prompt: string
) => {

  if (!prompt?.trim()) {
    throw new Error("전략 생성 프롬프트가 비어있습니다.");
  }

  try {

    const response = await api.post(
      "/api/ai/generate-strategy",
      {
        prompt: prompt.trim()
      }
    );

    return {
      success: true,
      data: response.data
    };

  } catch (error: any) {

    console.error(
      "[Gemini Strategy Error]",
      error
    );

    throw new Error(
      safeError(
        error,
        "전략 생성 중 오류가 발생했습니다."
      )
    );
  }
};

export const getMarketAnalysis = async (
  marketData: any
) => {

  if (!marketData) {
    throw new Error("시장 데이터가 없습니다.");
  }

  try {

    const response = await api.post(
      "/api/ai/market-analysis",
      {
        marketData
      }
    );

    return {
      success: true,
      data: response.data
    };

  } catch (error: any) {

    console.error(
      "[Gemini Market Analysis Error]",
      error
    );

    throw new Error(
      safeError(
        error,
        "시장 분석 생성 중 오류가 발생했습니다."
      )
    );
  }
};

export const generateGapDownReport = async (
  payload: {
    stockInfo: any;
    orderbook?: any;
    marketContext?: any;
  }
) => {

  if (!payload?.stockInfo) {
    throw new Error(
      "종목 정보가 존재하지 않습니다."
    );
  }

  try {

    const response = await api.post(
      "/api/ai/gapdown-report",
      payload
    );

    return {
      success: true,
      data: response.data
    };

  } catch (error: any) {

    console.error(
      "[Gemini GapDown Report Error]",
      error
    );

    throw new Error(
      safeError(
        error,
        "갭하락 분석 보고서 생성 중 오류가 발생했습니다."
      )
    );
  }
};