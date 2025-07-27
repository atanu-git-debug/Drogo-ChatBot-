"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

interface Message {
  sender: "user" | "bot";
  text: string;
  id: number;
  time: string;
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      // @ts-ignore
      window["pdfjsLib"].GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    inputRef.current?.focus();
  }, [messages, isTyping]);

  const fetchGeminiResponse = async (history: Message[]) => {
    const contents = history.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });
      const data = await res.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Sorry, I couldn't understand that."
      );
    } catch {
      return "Something went wrong—please try again.";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsTyping(true);

    const time = dayjs().format("HH:mm");
    const userMsg: Message = {
      sender: "user",
      text: input,
      id: Date.now(),
      time,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const aiText = await fetchGeminiResponse([...messages, userMsg]);
    const botMsg: Message = {
      sender: "bot",
      text: aiText,
      id: Date.now() + 1,
      time: dayjs().format("HH:mm"),
    };
    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const typedArray = new Uint8Array(arrayBuffer);

      // @ts-ignore
      const pdf = await window["pdfjsLib"].getDocument({ data: typedArray }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const textItems = content.items.map((item: any) => item.str);
        fullText += textItems.join(" ") + "\n";
      }

      const time = dayjs().format("HH:mm");
      setMessages((prev) => [
        ...prev,
        {
          sender: "user",
          text: `📄 PDF Uploaded: ${file.name}`,
          id: Date.now(),
          time,
        },
      ]);
      console.log("📄 Full PDF Content:\n", fullText);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-xl shadow-2xl rounded-3xl overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-white dark:bg-gray-800">
            <h1 className="text-2xl font-bold">Drogo</h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="focus:outline-none text-lg"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>

          <CardContent className="flex flex-col h-[500px] bg-white dark:bg-gray-850">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 text-sm shadow max-w-[90%] ${
                        msg.sender === "user"
                          ? "bg-green-500 text-white rounded-[20px] rounded-br-none"
                          : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 rounded-[20px] rounded-bl-none"
                      }`}
                    >
                      <div>{msg.text}</div>
                      <div className="mt-1 text-[10px] opacity-60 text-right">
                        {msg.time}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 0.8,
                    }}
                    className="flex justify-start"
                  >
                    <div className="px-4 py-2 rounded-[20px] rounded-bl-none bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 italic text-xs">
                      Drogo is typing...
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Section */}
            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl"
              >
                <div className="flex flex-1 items-center bg-gray-100 dark:bg-gray-700 text-sm rounded-full px-4 py-2 shadow-inner">
                  <input
                    ref={inputRef}
                    className="flex-1 bg-transparent outline-none border-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Type a message"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isTyping}
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                />

                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full p-2 text-black dark:text-white"
                  title="Upload PDF"
                >
                  🔗
                </Button>

           <Button
            type="submit"
            className="bg-green-500 hover:bg-green-600 rounded-full p-2 text-white disabled:opacity-50"
             disabled={isTyping}
          >
            <img
              src="./paper-plane.png"
              alt="Send"
              className="w-5 h-5"
            />
          </Button>

              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBot;
