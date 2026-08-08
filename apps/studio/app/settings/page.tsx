import { SettingsForm } from "./SettingsForm";

export default function StudioSettingsPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Config</p>
          <h1>站点配置</h1>
          <p>编辑 config/ 中可公开的博客配置，不处理任何私有密钥。</p>
        </div>
      </header>

      <SettingsForm />
    </div>
  );
}