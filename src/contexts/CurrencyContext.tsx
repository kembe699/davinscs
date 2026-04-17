import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Currency, getCurrencies, getBaseCurrency, clearCurrencyCache } from '@/utils/currency';

interface CurrencyContextType {
  currencies: Currency[];
  baseCurrency: Currency | null;
  loading: boolean;
  refreshCurrencies: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrencies = async () => {
    setLoading(true);
    try {
      const [allCurrencies, base] = await Promise.all([
        getCurrencies(),
        getBaseCurrency()
      ]);
      setCurrencies(allCurrencies);
      setBaseCurrency(base);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrencies = async () => {
    clearCurrencyCache();
    await loadCurrencies();
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  return (
    <CurrencyContext.Provider value={{ currencies, baseCurrency, loading, refreshCurrencies }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
