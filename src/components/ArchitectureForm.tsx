'use client';

import React from 'react';
import { DYNASTY_STYLES, ARCHITECTURE_TYPES, NEW_YEAR_PRINT_STYLES } from '@/lib/prompt-templates';

interface FormData {
  dynasty: string;
  architectureType: string;
  specificBuilding: string;
  newYearPrintStyle: string;
  additionalRequirements: string;
}

interface Props {
  formData: FormData;
  onChange: (data: Partial<FormData>) => void;
}

export default function ArchitectureForm({ formData, onChange }: Props) {
  const dynasties = Object.keys(DYNASTY_STYLES);
  const architectureTypes = Object.keys(ARCHITECTURE_TYPES);
  const printStyles = Object.keys(NEW_YEAR_PRINT_STYLES);

  return (
    <div className="architecture-form">
      <div className="form-group">
        <label>选择朝代（可选）</label>
        <select
          value={formData.dynasty}
          onChange={(e) => onChange({ dynasty: e.target.value })}
        >
          <option value="">不指定朝代</option>
          {dynasties.map((d) => (
            <option key={d} value={d}>{DYNASTY_STYLES[d].name}</option>
          ))}
        </select>
        {formData.dynasty && (
          <p className="hint">{DYNASTY_STYLES[formData.dynasty].culturalContext}</p>
        )}
      </div>

      <div className="form-group">
        <label>建筑类型 <span className="required">*</span></label>
        <select
          value={formData.architectureType}
          onChange={(e) => onChange({ architectureType: e.target.value })}
          required
        >
          <option value="">请选择建筑类型</option>
          {architectureTypes.map((t) => (
            <option key={t} value={t}>{ARCHITECTURE_TYPES[t].name} - {ARCHITECTURE_TYPES[t].description}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>具体建筑名称（可选）</label>
        <input
          type="text"
          value={formData.specificBuilding}
          onChange={(e) => onChange({ specificBuilding: e.target.value })}
          placeholder="如：佛光寺大殿、应县木塔"
        />
      </div>

      <div className="form-group">
        <label>年画风格（可选）</label>
        <select
          value={formData.newYearPrintStyle}
          onChange={(e) => onChange({ newYearPrintStyle: e.target.value })}
        >
          <option value="">不使用年画风格</option>
          {printStyles.map((s) => (
            <option key={s} value={s}>{NEW_YEAR_PRINT_STYLES[s].name}</option>
          ))}
        </select>
        {formData.newYearPrintStyle && (
          <p className="hint">{NEW_YEAR_PRINT_STYLES[formData.newYearPrintStyle].culturalSignificance}</p>
        )}
      </div>

      <div className="form-group">
        <label>额外要求（可选）</label>
        <textarea
          value={formData.additionalRequirements}
          onChange={(e) => onChange({ additionalRequirements: e.target.value })}
          placeholder="如：添加远山背景、夕阳氛围、添加祥云装饰等"
          rows={2}
        />
      </div>

      <style jsx>{`
        .architecture-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        .required {
          color: #c45656;
        }
        select, input, textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          background: white;
        }
        select:focus, input:focus, textarea:focus {
          outline: none;
          border-color: #c45656;
          box-shadow: 0 0 0 3px rgba(196, 86, 86, 0.1);
        }
        textarea {
          resize: vertical;
          font-family: inherit;
        }
        .hint {
          font-size: 12px;
          color: #666;
          margin: 0;
          padding-left: 4px;
        }
      `}</style>
    </div>
  );
}
