import {
  setWitVariance,
  useWitVariance,
  WitVarianceSettings,
} from '@/store/settings.store';

import { setShowWitVarianceSettings, useUIStore } from '@/store/ui.store';
import './style.css';

export function WitVarianceModal() {
  const { showWitVarianceSettings: show } = useUIStore();
  const settings = useWitVariance();

  const toggleSetting = (setting: keyof WitVarianceSettings) => {
    setWitVariance({ [setting]: !settings[setting] });
  };

  const onClose = () => {
    setShowWitVarianceSettings(false);
  };

  if (!show) return null;

  return (
    <div className="wit-variance-popup-overlay" onClick={onClose}>
      <div className="wit-variance-popup" onClick={(e) => e.stopPropagation()}>
        <div className="wit-variance-popup-header">
          <h3>Wit Variance Settings</h3>
          <button className="wit-variance-popup-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="wit-variance-popup-content">
          <div className="wit-variance-setting">
            <label>Rushed State</label>
            <div className="wit-variance-checkboxes">
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(42, 119, 197)' }}>Uma 1</label>
                <input
                  type="checkbox"
                  checked={settings.allowRushedUma1}
                  onChange={() => toggleSetting('allowRushedUma1')}
                />
              </div>
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(197, 42, 42)' }}>Uma 2</label>
                <input
                  type="checkbox"
                  checked={settings.allowRushedUma2}
                  onChange={() => toggleSetting('allowRushedUma2')}
                />
              </div>
            </div>
          </div>
          <div className="wit-variance-setting">
            <label>Downhill Mode</label>
            <div className="wit-variance-checkboxes">
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(42, 119, 197)' }}>Uma 1</label>
                <input
                  type="checkbox"
                  checked={settings.allowDownhillUma1}
                  onChange={() => toggleSetting('allowDownhillUma1')}
                />
              </div>
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(197, 42, 42)' }}>Uma 2</label>
                <input
                  type="checkbox"
                  checked={settings.allowDownhillUma2}
                  onChange={() => toggleSetting('allowDownhillUma2')}
                />
              </div>
            </div>
          </div>
          <div className="wit-variance-setting">
            <label>Section Modifier</label>
            <div className="wit-variance-checkboxes">
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(42, 119, 197)' }}>Uma 1</label>
                <input
                  type="checkbox"
                  checked={settings.allowSectionModifierUma1}
                  onChange={() => toggleSetting('allowSectionModifierUma1')}
                />
              </div>
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(197, 42, 42)' }}>Uma 2</label>
                <input
                  type="checkbox"
                  checked={settings.allowSectionModifierUma2}
                  onChange={() => toggleSetting('allowSectionModifierUma2')}
                />
              </div>
            </div>
          </div>
          <div className="wit-variance-setting">
            <label>Skill Check Chance</label>
            <div className="wit-variance-checkboxes">
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(42, 119, 197)' }}>Uma 1</label>
                <input
                  type="checkbox"
                  checked={settings.allowSkillCheckChanceUma1}
                  onChange={() => toggleSetting('allowSkillCheckChanceUma1')}
                />
              </div>
              <div className="wit-variance-checkbox-group">
                <label style={{ color: 'rgb(197, 42, 42)' }}>Uma 2</label>
                <input
                  type="checkbox"
                  checked={settings.allowSkillCheckChanceUma2}
                  onChange={() => toggleSetting('allowSkillCheckChanceUma2')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
