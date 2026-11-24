'use client';
import { useState } from 'react';
import { Share2 } from 'lucide-react';
export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState('');
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        setMessage('주소를 복사했어요.');
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setMessage('주소창의 링크를 복사해주세요.');
    }
  }
  return (
    <div className="share-control">
      <button className="button secondary small" onClick={share}>
        <Share2 size={14} /> 공유하기
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
