"use client";

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { withBasePath } from '../lib/sitePath.mjs';
import { nextCompanionMessages } from '../lib/companionSession.mjs';
import type { CompanionMessage } from '../lib/companionSession.mjs';
import styles from './CyberCat.module.css';

/** Public-blog companion. The manager keeps its own local-only pet component. */
export default function CyberCat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reaction, setReaction] = useState('');
  const launcher = useRef<HTMLButtonElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const face = busy ? 'worry' : reaction ? 'blink' : 'idle';

  useEffect(() => {
    if (open) textarea.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages, busy, open]);
  useEffect(() => () => {
    request.current?.abort();
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
  }, []);

  function close() { setOpen(false); launcher.current?.focus({ preventScroll: true }); }
  function respondLocally(text: string) {
    setReaction(text);
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(''), 4000);
  }
  function clearConversation() {
    if (request.current) return;
    setMessages([]); setInput(''); setError(''); setReaction('');
    textarea.current?.focus({ preventScroll: true });
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || request.current) return;
    const conversation = nextCompanionMessages(messages, input);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 35_000);
    setBusy(true); setError('');
    try {
      const response = await fetch(withBasePath('/api/chat'), {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: conversation }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const detail = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : '小鲸鱼暂时没有接到消息，请稍后重试。';
        throw new Error(detail);
      }
      if (!data || typeof data !== 'object' || !('reply' in data) || typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error('小鲸鱼刚才没说清楚，可以再发一次吗？');
      }
      setMessages([...conversation, { role: 'assistant', content: data.reply }].slice(-8) as CompanionMessage[]);
      setInput(''); setReaction('');
    } catch (cause) {
      const detail = cause instanceof Error && cause.name !== 'AbortError' && !(cause instanceof TypeError) && !(cause instanceof SyntaxError) ? cause.message : '这次没连上小鲸鱼，输入还在，可以稍后重试呀。';
      setError(detail);
    } finally {
      clearTimeout(timeout); request.current = null; setBusy(false);
      textarea.current?.focus({ preventScroll: true });
    }
  }

  return <aside className={styles.companion} aria-label="小鲸鱼 AI 伙伴">
    {open && <section id="whale-chat" className={styles.panel} aria-labelledby="whale-chat-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>LITTLE WHALE · AI</p><h2 id="whale-chat-title">和小鲸鱼聊一会儿</h2></div>
        <button type="button" className={styles.iconButton} onClick={close} aria-label="收起小鲸鱼聊天" title="收起聊天">×</button>
      </header>
      <div className={styles.welcome}>
        <button type="button" className={styles.portrait} aria-label="摸摸小鲸鱼" onClick={() => respondLocally('嘿嘿……才、才没有很开心啦～')}>
          <Image src={withBasePath(`/pets/little-whale/${face}.png`)} width={384} height={432} alt="蓝发鲸鱼娘小鲸鱼" unoptimized />
        </button>
        <div><p className={styles.greeting}>我是博客里的 AI 小鲸鱼。<br />想说什么？我在听呀～</p>
          <div className={styles.localActions}><button type="button" onClick={() => respondLocally('嘿嘿……才、才没有很开心啦～')}>摸摸</button><button type="button" onClick={() => respondLocally('啊呜，谢谢小鱼！尾巴都开心起来啦～')}>喂小鱼</button></div>
        </div>
      </div>
      {reaction && <p className={styles.reaction} role="status">{reaction}</p>}
      <div ref={history} className={styles.history} role="log" aria-label="本页聊天记录" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <p className={styles.empty}>留一句问候，或聊聊今天的小事。</p>}
        {messages.map((message, index) => <div key={index} className={message.role === 'user' ? styles.userMessage : styles.assistantMessage}>
          <span className={styles.speaker}>{message.role === 'user' ? '你' : '小鲸鱼 · AI'}</span><p>{message.content}</p>
        </div>)}
        {busy && <p className={styles.thinking} role="status">小鲸鱼正在想怎么回答你…</p>}
      </div>
      <form onSubmit={event => void send(event)} className={styles.form}>
        <label htmlFor="whale-message">想对小鲸鱼说的话</label>
        <textarea ref={textarea} id="whale-message" rows={2} maxLength={1000} value={input} disabled={busy} placeholder="你好呀，小鲸鱼…" onChange={event => setInput(event.target.value)} aria-describedby="whale-privacy" />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.formActions}><button type="button" onClick={clearConversation} disabled={busy} className={styles.clearButton}>清空会话</button><button type="submit" disabled={busy || !input.trim()} className={styles.sendButton}>{busy ? '正在回应…' : error ? '重试发送' : '发送'}</button></div>
      </form>
      <footer className={styles.footer}><p id="whale-privacy">发送内容由 DeepSeek 处理；对话仅暂存在本页。<br />AI 可能会出错，请勿发送隐私。</p><a href={withBasePath('/pets/little-whale/NOTICE-PC2005.txt')} target="_blank" rel="noreferrer">角色素材署名 · CC BY-NC-SA</a></footer>
    </section>}
    <button ref={launcher} type="button" className={styles.launcher} onClick={() => open ? close() : setOpen(true)} aria-expanded={open} aria-controls="whale-chat" aria-label={open ? '收起小鲸鱼聊天' : '展开小鲸鱼聊天'}>
      <span className={styles.launcherArt}><Image src={withBasePath(`/pets/little-whale/${face}.png`)} width={384} height={432} alt="" unoptimized /></span>
      <span className={styles.launcherCopy}><strong>小鲸鱼 <span>AI</span></strong><small>{busy ? '正在认真想…' : open ? '收起聊天' : '陪你聊一小会儿'}</small></span>
    </button>
  </aside>;
}
