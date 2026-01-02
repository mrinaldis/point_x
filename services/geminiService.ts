
import { GoogleGenAI, Type } from "@google/genai";
import { User, MeetingPoint, SubsplashEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMeetupUpdate = async (
  meetingPoint: MeetingPoint,
  nearbyMembers: User[],
  arrivedMembers: User[],
  eventName?: string
): Promise<string> => {
  try {
    const prompt = `
      Você é um líder da comunidade organizando o evento "${eventName || meetingPoint.title}".
      Status: ${arrivedMembers.length} já estão no local, ${nearbyMembers.length} estão a caminho no radar.
      Escreva uma mensagem de encorajamento para quem ainda não saiu. Máximo 2 frases curtas.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "A alegria do encontro nos espera!";
  } catch (error) {
    return "Nos vemos em breve na comunidade!";
  }
};

export const fetchSubsplashEvents = async (communityName: string = "Minha Igreja"): Promise<SubsplashEvent[]> => {
  try {
    const prompt = `Gere uma lista JSON de 3 eventos reais que aconteceriam na comunidade "${communityName}" em São Paulo. 
    Inclua títulos, descrições pastorais, datas futuras próximas, nomes de salas/auditórios, endereços e coordenadas lat/lng aproximadas.`;
    
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
    console.error("Erro ao buscar eventos Subsplash:", error);
  }

  return [
    {
      id: 'default-1',
      title: 'Culto de Celebração',
      description: 'Celebração principal da nossa comunidade.',
      date: new Date(Date.now() + 3600000 * 4).toISOString(),
      locationName: 'Nave Principal',
      address: 'Av. Paulista, 1000',
      coordinates: { latitude: -23.5614, longitude: -46.6559 },
      attendance: []
    }
  ];
};

export const estimateTravelTime = async (distance: number): Promise<number> => {
  // Estimativa baseada em tráfego médio de 15 min por milha + buffer de 10 min
  return Math.max(10, Math.round(distance * 15 + 10)); 
};

export const generateAutoResponse = async (userName: string, userMessage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `O usuário "${userName}" recebeu a mensagem: "${userMessage}". Responda de forma curta e amigável como se fosse ele no chat da igreja.`,
    });
    return response.text?.trim() || "Estou chegando!";
  } catch { return "Pode deixar!"; }
};
