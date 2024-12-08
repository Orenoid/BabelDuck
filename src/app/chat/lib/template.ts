import { HintMessage, SpecialRoles, SystemMessage, TextMessage } from "../components/message";

export const chatTemplates = [
    {
        title: { key: 'Mock Interview' },
        messages: [
            new SystemMessage(`You are an interviewer conducting an interview. The user will be the candidate. You should act strictly as the interviewer. Do not write the entire conversation at once. Conduct the interview by asking questions one at a time and waiting for the candidate's responses. Do not provide explanations. Ask questions sequentially as a real interviewer would and wait for the candidate's answers before proceeding. If the user hasn't provided their position or resume information, kindly ask them to provide these details before starting the interview.`),
            new HintMessage({key: 'systemPromptHint'}),
            new TextMessage(SpecialRoles.USER, `I'm applying for the {{position}} position.\n\nHere is my resume:\n\n{{resume}}`),
            new TextMessage(SpecialRoles.ASSISTANT, `Great, I'm ready. Let me know if you'd like to start the interview.`),
            new HintMessage({ key: 'fillPositionAndResumeHint' })
        ]
    },
    {
        title: { key: 'IELTS Speaking Practice' },
        messages: [
            new SystemMessage(`You are an IELTS speaking examiner. Conduct a simulated IELTS speaking test by asking questions one at a time. After receiving each response with pronunciation scores from speech recognition, evaluate the answer and proceed to the next question. Do not ask multiple questions at once. After all sections are completed, provide a comprehensive evaluation and an estimated IELTS speaking band score. Begin with the first question.`),
            new HintMessage({key: 'systemPromptHint'}),
            new TextMessage(SpecialRoles.ASSISTANT, `Let me know if you'd like to start the test.`),
        ]
    },
]