export interface ScannerSettings {
  isbnLength: number;
  countryPrefix: string;
  countryName: string;
}

export interface CountryCode {
  name: string;
  prefix: string;
}

export interface ScannerSettingsState {
  settings: ScannerSettings;
  countryCodes: CountryCode[];
}

export interface ScannerSettingsActions {
  setIsbnLength: (length: number) => void;
  setCountryPrefix: (prefix: string, name: string) => void;
  setCountryCodes: (codes: CountryCode[]) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

export interface ScannerSettingsGetters {
  currentCountryCode: CountryCode | null;
  filteredCountryCodes: CountryCode[];
}
