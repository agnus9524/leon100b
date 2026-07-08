import axios from "axios";

export const generateStrategyFromNL = async (prompt: string) => {
  try {
    const response = await axios.post('/api/ai/generate-strategy', { prompt });
    return response.data;
  } catch (error: any) {
    console.error("Gemini Strategy Generation Error:", error);
    throw new Error(error.response?.data?.message || "전략 생성 중 오류가 발생했습니다.");
  }
};

export const getMarketAnalysis = async (marketData: any) => {
  try {
    const response = await axios.post('/api/ai/market-analysis', { marketData });
    return response.data;
  } catch (error: any) {
    console.error("Gemini Market Analysis Error:", error);
    throw new Error(error.response?.data?.message || "분석 생성 중 오류가 발생했습니다.");
  }
};
