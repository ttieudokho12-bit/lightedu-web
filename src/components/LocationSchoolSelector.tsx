import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Building2, School, ChevronDown, Search, X, Pencil } from 'lucide-react';
import {
  getProvinces,
  getCommunesByProvince,
  getSchoolsByCommune,
  normalizeViSearch,
} from '../data/schoolCatalog';

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  emptyHint?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  accent?: 'emerald' | 'blue';
  icon: React.ReactNode;
  allowCustom?: boolean;
  customPlaceholder?: string;
  countLabel?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder,
  emptyHint,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  accent = 'emerald',
  icon,
  allowCustom = true,
  customPlaceholder = 'Nhập thủ công...',
  countLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // If value exists and isn't in options (e.g. legacy record), allow viewing/editing cleanly
  const isValueInOptions = useMemo(() => {
    if (!value) return true;
    const normVal = normalizeViSearch(value);
    return options.some((opt) => normalizeViSearch(opt) === normVal);
  }, [value, options]);

  useEffect(() => {
    if (value && options.length > 0) {
      setIsCustomMode(!isValueInOptions);
    }
  }, [value, options.length, isValueInOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = normalizeViSearch(query);
    if (!q) return options;
    return options.filter((opt) => normalizeViSearch(opt).includes(q));
  }, [options, query]);

  const ringClass = accent === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-emerald-500';
  const activeBgClass = accent === 'blue' ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-emerald-50 text-emerald-700 font-bold';
  const badgeTextClass = accent === 'blue' ? 'text-blue-600' : 'text-emerald-600';

  if (isCustomMode) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
            {label} {required && <span className="text-red-400">*</span>}
          </label>
          {options.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                onChange('');
              }}
              className={`text-[10px] font-bold ${badgeTextClass} hover:underline`}
            >
              Chọn từ danh sách
            </button>
          )}
        </div>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none">
            {icon}
          </div>
          <input
            type="text"
            placeholder={customPlaceholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full pl-10 pr-9 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 ${ringClass} bg-white`}
            required={required}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500"
              title="Xóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <div className="flex items-center justify-between px-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {countLabel && !disabled && (
          <span className="text-[10px] font-mono text-stone-400">{countLabel}</span>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full pl-10 pr-9 py-3 rounded-xl border border-stone-200 text-sm text-left outline-none transition-all flex items-center justify-between ${
            disabled
              ? 'bg-stone-50 text-stone-400 cursor-not-allowed'
              : `bg-white hover:border-stone-300 focus:ring-2 ${ringClass}`
          }`}
        >
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none">
            {icon}
          </span>
          <span className={`truncate ${value ? 'text-stone-900 font-medium' : 'text-stone-400'}`}>
            {value || (disabled && emptyHint ? emptyHint : placeholder)}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-600 p-1"
            title="Bỏ chọn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden">
          {options.length > 5 && (
            <div className="p-2 border-b border-stone-100 bg-stone-50/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Gõ để tìm nhanh..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-stone-400 italic">
                Không tìm thấy kết quả phù hợp "{query}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = normalizeViSearch(opt) === normalizeViSearch(value);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? activeBgClass : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="leading-snug">{opt}</span>
                  </button>
                );
              })
            )}
          </div>

          {allowCustom && (
            <div className="border-t border-stone-100 bg-stone-50/70 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsCustomMode(true);
                }}
                className="w-full px-3 py-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Pencil className="w-3 h-3" />
                <span>Không có trong danh sách? Nhập thủ công...</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface LocationSchoolSelectorProps {
  provinceName: string;
  communeName: string;
  schoolName: string;
  onProvinceChange: (province: string) => void;
  onCommuneChange: (commune: string) => void;
  onSchoolChange: (school: string) => void;
  required?: boolean;
  accent?: 'emerald' | 'blue';
}

export const LocationSchoolSelector: React.FC<LocationSchoolSelectorProps> = ({
  provinceName,
  communeName,
  schoolName,
  onProvinceChange,
  onCommuneChange,
  onSchoolChange,
  required = true,
  accent = 'emerald',
}) => {
  const provinces = useMemo(() => getProvinces(), []);
  const communes = useMemo(() => getCommunesByProvince(provinceName), [provinceName]);
  const schools = useMemo(
    () => getSchoolsByCommune(provinceName, communeName),
    [provinceName, communeName]
  );

  const handleProvinceSelect = (newProvince: string) => {
    onProvinceChange(newProvince);
    if (normalizeViSearch(newProvince) !== normalizeViSearch(provinceName)) {
      onCommuneChange('');
      onSchoolChange('');
    }
  };

  const handleCommuneSelect = (newCommune: string) => {
    onCommuneChange(newCommune);
    if (normalizeViSearch(newCommune) !== normalizeViSearch(communeName)) {
      onSchoolChange('');
    }
  };

  const isCustomProvince = Boolean(
    provinceName && !provinces.some((p) => normalizeViSearch(p) === normalizeViSearch(provinceName))
  );
  const isCustomCommune = Boolean(
    communeName &&
      communes.length > 0 &&
      !communes.some((c) => normalizeViSearch(c) === normalizeViSearch(communeName))
  );

  return (
    <div className="space-y-3">
      {/* 1. Tên tỉnh / Thành phố */}
      <SearchableSelect
        label="1. Tên tỉnh / Thành phố"
        placeholder="-- Chọn tỉnh / thành phố --"
        value={provinceName}
        options={provinces}
        onChange={handleProvinceSelect}
        required={required}
        accent={accent}
        icon={<MapPin className="w-4 h-4" />}
        customPlaceholder="Nhập tên tỉnh / thành phố..."
        countLabel={`${provinces.length} tỉnh`}
      />

      {/* 2. Tên xã / Phường */}
      {isCustomProvince ? (
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">
            2. Tên xã / Phường {required && <span className="text-red-400">*</span>}
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
            <input
              type="text"
              placeholder="Nhập tên xã / phường..."
              value={communeName}
              onChange={(e) => onCommuneChange(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 ${
                accent === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
              }`}
              required={required}
            />
          </div>
        </div>
      ) : (
        <SearchableSelect
          label="2. Tên xã / Phường"
          placeholder="-- Chọn xã / phường --"
          emptyHint="Vui lòng chọn tỉnh trước"
          value={communeName}
          options={communes}
          onChange={handleCommuneSelect}
          disabled={!provinceName}
          required={required}
          accent={accent}
          icon={<Building2 className="w-4 h-4" />}
          customPlaceholder="Nhập tên xã / phường..."
          countLabel={communes.length > 0 ? `${communes.length} xã/phường` : undefined}
        />
      )}

      {/* 3. Tên trường */}
      {isCustomProvince || isCustomCommune ? (
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">
            3. Tên trường {required && <span className="text-red-400">*</span>}
          </label>
          <div className="relative">
            <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
            <input
              type="text"
              placeholder="Nhập tên trường học..."
              value={schoolName}
              onChange={(e) => onSchoolChange(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 ${
                accent === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
              }`}
              required={required}
            />
          </div>
        </div>
      ) : (
        <SearchableSelect
          label="3. Tên trường"
          placeholder="-- Chọn trường học --"
          emptyHint="Vui lòng chọn xã / phường trước"
          value={schoolName}
          options={schools}
          onChange={onSchoolChange}
          disabled={!provinceName || !communeName}
          required={required}
          accent={accent}
          icon={<School className="w-4 h-4" />}
          customPlaceholder="Nhập tên trường học..."
          countLabel={schools.length > 0 ? `${schools.length} trường` : undefined}
        />
      )}
    </div>
  );
};
