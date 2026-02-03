import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTutorialStore, confirmExit, cancelExit } from '@/store/tutorial.store';

export function TutorialExitDialog() {
  const showExitDialog = useTutorialStore((state) => state.showExitDialog);

  return (
    <AlertDialog open={showExitDialog} onOpenChange={(open) => !open && cancelExit()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit Tutorial?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to exit the tutorial? You can always restart it by clicking the
            help button.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelExit}>Stay in Tutorial</AlertDialogCancel>
          <AlertDialogAction onClick={confirmExit} variant="destructive">
            Exit Tutorial
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
