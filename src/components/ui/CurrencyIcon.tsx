import { IndianRupee, DollarSign, Euro, PoundSterling, JapaneseYen, Coins, type LucideProps } from 'lucide-react';

interface CurrencyIconProps extends LucideProps {
  currency?: string;
}

export function CurrencyIcon({ currency = 'INR', ...props }: CurrencyIconProps) {
  const code = currency?.toUpperCase();
  switch (code) {
    case 'INR':
      return <IndianRupee {...props} />;
    case 'USD':
    case 'CAD':
    case 'AUD':
    case 'NZD':
    case 'SGD':
      return <DollarSign {...props} />;
    case 'EUR':
      return <Euro {...props} />;
    case 'GBP':
      return <PoundSterling {...props} />;
    case 'JPY':
    case 'CNY':
      return <JapaneseYen {...props} />;
    default:
      return <Coins {...props} />;
  }
}

export default CurrencyIcon;
