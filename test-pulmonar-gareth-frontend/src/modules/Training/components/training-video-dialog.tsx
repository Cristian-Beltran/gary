import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TrainingExercise } from "../training.interface";

type Props = {
  exercise: TrainingExercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TrainingVideoDialog({ exercise, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{exercise?.videoTitle ?? exercise?.title ?? "Video de ejercicio"}</DialogTitle>
          <DialogDescription>
            {exercise?.videoDescription ?? exercise?.goal ?? "Sigue la tecnica respiratoria mostrada en el video."}
          </DialogDescription>
        </DialogHeader>

        {exercise?.videoUrl ? (
          <video
            key={exercise.videoUrl}
            className="w-full rounded-lg border bg-black"
            controls
            preload="metadata"
          >
            <source src={exercise.videoUrl} type="video/mp4" />
            Tu navegador no soporta video HTML5.
          </video>
        ) : (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Este ejercicio no tiene video asociado.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
