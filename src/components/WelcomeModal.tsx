import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, WifiOff, Download, Sparkles, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'splitlocal_welcome_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (import.meta.env?.MODE === 'test') {
      return;
    }

    // Check if user has already dismissed welcome popup
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setOpen(true);
    }

    // Detect if already running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Capture install prompt if available
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const handleInstall = async () => {
    if (installPrompt) {
      await (installPrompt as any)['prompt']();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        handleDismiss();
      }
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <DialogHeader className="space-y-3 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Welcome to SplitLocal 👋
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Your private, offline-first expense & shared debt tracker.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 my-2 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs sm:text-sm">100% Local-First & Private</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                All your expenses, friends, and settlements live exclusively in your browser database. Nothing is sent to the cloud.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <WifiOff className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs sm:text-sm">Zero Internet Required</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Add expenses and track balances anywhere, anytime, even in remote places without signal.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs sm:text-sm">Install for the Best Experience</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isStandalone
                  ? "You're already running SplitLocal as an installed app! Data is fast and permanently protected."
                  : "Installing SplitLocal as an app protects your data from browser cache eviction, removes address bars, and gives instant launch from your home screen."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          {installPrompt && !isStandalone && (
            <Button
              onClick={handleInstall}
              className="w-full sm:flex-1 rounded-xl h-10 font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          )}
          <Button
            onClick={handleDismiss}
            variant={installPrompt && !isStandalone ? "outline" : "default"}
            className="w-full sm:flex-1 rounded-xl h-10 font-medium"
          >
            {isStandalone ? "Start Tracking" : "Continue to App"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
