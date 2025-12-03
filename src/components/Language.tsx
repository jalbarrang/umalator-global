import { useContext, useEffect, useState, createContext } from 'react';

import './Language.css';

const defaultLanguage =
  localStorage.getItem('language') ||
  (navigator.language.startsWith('ja') ? 'ja' : 'en-ja');

export function useLanguageSelect() {
  const p = useState(defaultLanguage);
  useEffect(() => localStorage.setItem('language', p[0]), [p[0]]);
  return p;
}

export const Language = createContext(defaultLanguage);

export const useLanguage = () => {
  return useContext(Language);
};

type LanguageProviderProps = {
  lang: string;
  children: React.ReactNode;
};

export const LanguageProvider = (props: LanguageProviderProps) => {
  return (
    <Language.Provider value={props.lang}>{props.children}</Language.Provider>
  );
};

type LanguageSelectProps = {
  language: string;
  setLanguage: (language: string) => void;
};

export function LanguageSelect(props: LanguageSelectProps) {
  const handleChange = (e) => props.setLanguage(e.target.value);

  return (
    <select
      className="langSelect"
      value={props.language}
      onChange={handleChange}
    >
      <option value="en">English</option>
      <option value="ja">日本語</option>
    </select>
  );
}
