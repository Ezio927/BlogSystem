import { useRef } from 'react';
import { useToast } from '../components/ToastProvider';

export function useCollectionSave(kind: string, revision: string | null) {
  const current = useRef(revision);
  const saving = useRef(false);
  const { showToast } = useToast();
  return async (items: unknown[]) => {
    if (saving.current) return false;
    saving.current = true;
    try {
      const { api_port } = await (await fetch('/backend_config.json')).json();
      const response = await fetch(`http://127.0.0.1:${api_port}/api/collections/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: current.current, items }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : '保存失败');
      current.current = data.revision;
      showToast('已保存，刷新公网即可查看', 'success');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : '连接失败，请重试', 'error');
      return false;
    } finally {
      saving.current = false;
    }
  };
}
