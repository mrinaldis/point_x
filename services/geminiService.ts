
import { GoogleGenAI, Type } from "@google/genai";
import { User, MeetingPoint, SubsplashEvent, Coordinates } from "../types";

const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

/**
 * Usa o Gemini para transformar uma busca de texto em coordenadas reais (Lat/Lng)
 */
export const resolveLocation = async (query: string): Promise<Coordinates | null> => {
  try {
    const ai = getAiInstance();
    if (!ai) return null;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Encontre as coordenadas geográficas (latitude e longitude) para o seguinte local: "${query}". Responda apenas o JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            latitude: { type: Type.NUMBER },
            longitude: { type: Type.NUMBER },
            address: { type: Type.STRING }
          },
          required: ["latitude", "longitude"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (error) {
    console.error("Erro ao resolver localização:", error);
  }
  return null;
};

export const getMeetupUpdate = async (
  meetingPoint: MeetingPoint,
  nearbyMembers: User[],
  arrivedMembers: User[],
  eventName?: string
): Promise<string> => {
  try {
    const ai = getAiInstance();
    if (!ai) return "Nos vemos em breve na comunidade!";
    
    const prompt = `
      Você é um líder da comunidade PointX organizando o evento "${eventName || meetingPoint.title}".
      Status: ${arrivedMembers.length} já estão no local, ${nearbyMembers.length} estão a caminho no radar.
      Escreva uma mensagem de encorajamento curta.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "A alegria do encontro nos espera!";
  } catch (error) {
    return "Nos vemos em breve!";
  }
};

export const fetchSubsplashEvents = async (communityName: string = "Minha Igreja"): Promise<SubsplashEvent[]> => {
  try {
    const ai = getAiInstance();
    if (!ai) throw new Error("API Key missing");

    const prompt = `Gere uma lista JSON de 3 eventos reais que aconteceriam na comunidade "${communityName}" em São Paulo. 
    Inclua títulos, descrições, datas, endereços e coordenadas lat/lng aproximadas.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
              locationName: { type: Type.STRING },
              address: { type: Type.STRING },
              coordinates: {
                type: Type.OBJECT,
                properties: {
                  latitude: { type: Type.NUMBER },
                  longitude: { type: Type.NUMBER }
                },
                required: ["latitude", "longitude"]
              }
            },
            required: ["title", "description", "date", "locationName", "address", "coordinates"]
          }
        }
      }
    });
    
    if (response.text) {
      const data = JSON.parse(response.text.trim());
      return data.map((e: any, i: number) => ({ 
        ...e, 
        id: `sub-${i}-${Date.now()}` 
      }));
    }
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
  }

  return [];
};
