import React, { useState, useEffect } from 'react';
import { Button, Card, Input, TextArea } from '../components/Components';
import { generateChatResponse, generateImage, checkApiKeySelection, openApiKeySelection } from '../services/geminiService';

export const AILab: React.FC = () => {
    const [tab, setTab] = useState<'chat' | 'image'>('chat');

    // Chat State
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Image State
    const [imgPrompt, setImgPrompt] = useState('');
    const [imgRes, setImgRes] = useState<'1K' | '2K' | '4K'>('1K');
    const [generatedImg, setGeneratedImg] = useState<string | null>(null);
    const [imgLoading, setImgLoading] = useState(false);
    const [keySelected, setKeySelected] = useState(false);

    useEffect(() => {
        // Initial check
        checkApiKeySelection().then(setKeySelected);
    }, []);

    const handleSendChat = async () => {
        if (!input.trim()) return;
        const newHistory = [...messages, { role: 'user' as const, text: input }];
        setMessages(newHistory);
        setInput('');
        setLoading(true);

        // Format for API
        const historyForApi = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const response = await generateChatResponse(historyForApi, input);

        setMessages([...newHistory, { role: 'model', text: response }]);
        setLoading(false);
    };

    const handleGenerateImage = async () => {
        if (!imgPrompt.trim()) return;

        // Safety check for API key
        if (!keySelected && window.aistudio) {
            try {
                await openApiKeySelection();
                setKeySelected(true);
            } catch (e) {
                alert("API Key selection required for High-Res Imaging.");
                return;
            }
        }

        setImgLoading(true);
        setGeneratedImg(null);
        try {
            const b64 = await generateImage(imgPrompt, imgRes);
            setGeneratedImg(b64);
        } catch (e) {
            alert("Imaging system failure. Check permissions.");
        } finally {
            setImgLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            <div className="flex gap-2 mb-4">
                <Button variant={tab === 'chat' ? 'primary' : 'secondary'} onClick={() => setTab('chat')} className="flex-1">
                    Tactical Advisor (Chat)
                </Button>
                <Button variant={tab === 'image' ? 'primary' : 'secondary'} onClick={() => setTab('image')} className="flex-1">
                    Visualizer (Image)
                </Button>
            </div>

            {tab === 'chat' ? (
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 mt-20">
                                <p>System Online. Awaiting queries.</p>
                                <p className="text-xs">Model: Gemini-3-Pro-Preview</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-neon-blue text-white' : 'bg-gray-800 text-gray-200'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && <div className="text-xs text-neon-blue animate-pulse">Typing...</div>}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                            placeholder="Ask for strategy..."
                        />
                        <Button onClick={handleSendChat} disabled={loading}>Send</Button>
                    </div>
                </Card>
            ) : (
                <Card className="flex-1 overflow-y-auto">
                    <div className="space-y-4">
                        {!keySelected && window.aistudio && (
                            <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded text-center">
                                <p className="mb-2 text-yellow-200">Payment method required for High-Fidelity Rendering (Veo/Pro)</p>
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs underline text-yellow-400 block mb-2">View Billing Docs</a>
                                <Button onClick={async () => { await openApiKeySelection(); setKeySelected(true); }}>
                                    Select API Key Project
                                </Button>
                            </div>
                        )}
                        <TextArea
                            placeholder="Describe the visual artifact..."
                            value={imgPrompt}
                            onChange={e => setImgPrompt(e.target.value)}
                        />
                        <div className="flex gap-4 items-center">
                            <select
                                className="bg-black/20 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                value={imgRes}
                                onChange={e => setImgRes(e.target.value as any)}
                            >
                                <option value="1K">1K Resolution</option>
                                <option value="2K">2K Resolution (Pro)</option>
                                <option value="4K">4K Resolution (Pro)</option>
                            </select>
                            <Button onClick={handleGenerateImage} disabled={imgLoading || (!keySelected && !!window.aistudio)} className="flex-1">
                                {imgLoading ? 'Rendering...' : 'Generate Artifact'}
                            </Button>
                        </div>

                        {generatedImg && (
                            <div className="mt-4 border border-gray-700 rounded-lg overflow-hidden">
                                <img src={generatedImg} alt="Generated" className="w-full h-auto" />
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};
