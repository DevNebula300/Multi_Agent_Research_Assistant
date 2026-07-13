import axiosClient from './axiosClient';

// Interfaces and types can be defined here as needed in the future

export const searchArxivPubmed = async (query: string, _source: 'arxiv' | 'pubmed' = 'arxiv') => {
  const response = await axiosClient.post('/api/search', { topic: query, max_results: 10 });
  return response.data;
};

export const askQuestion = async (question: string, topK: number = 5) => {
  const response = await axiosClient.post('/api/ask', { question, top_k: topK });
  return response.data;
};

export const generateLiteratureReview = async (topic: string, paperIds: string[], exportDocx: boolean = false) => {
  const response = await axiosClient.post('/api/lit-review', { topic, paper_ids: paperIds, export_docx: exportDocx });
  return response.data;
};

export const verifyClaim = async (answerText: string, paperIds: string[]) => {
  const response = await axiosClient.post('/api/check-claims', { answer_text: answerText, paper_ids: paperIds });
  return response.data;
};

export const detectGaps = async (paperIds: string[]) => {
  const response = await axiosClient.post('/api/gaps', { paper_ids: paperIds });
  return response.data;
};

export const summarizePapers = async (paperIds: string[]) => {
  const response = await axiosClient.post('/api/summarize', { paper_ids: paperIds });
  return response.data;
};

export const comparePapers = async (paperIds: string[]) => {
  const response = await axiosClient.post('/api/compare', { paper_ids: paperIds });
  return response.data;
};

export const exportDocx = async (filename: string) => {
  const response = await axiosClient.get(`/api/lit-review/download/${filename}`, {
    responseType: 'blob', // Necessary for file downloads
  });
  return response.data;
};
