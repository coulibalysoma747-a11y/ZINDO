"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/Empty";
import {
  saveChapterAction,
  deleteChapterAction,
  saveLessonAction,
  deleteLessonAction,
  setLessonDoneAction,
  type Chapter,
  type Lesson,
} from "@/lib/actions/school-teaching";
import { useResettingAction } from "@/components/school/useResettingAction";

function ChapterForm({ classId, subjectId, chapter, nextPosition, onDone }: { classId: string; subjectId: string; chapter?: Chapter; nextPosition: number; onDone?: () => void }) {
  const [state, formAction, pending] = useResettingAction(saveChapterAction, onDone);
  return (
    <form key={state?.n ?? 0} action={formAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      {chapter && <input type="hidden" name="id" value={chapter.id} />}
      <div className="w-20 shrink-0">
        <Input name="position" type="number" defaultValue={chapter?.position ?? nextPosition} aria-label="Numéro du chapitre" title="Numéro du chapitre" />
      </div>
      <Input name="title" defaultValue={chapter?.title} placeholder="Titre du chapitre" required className="min-w-0 flex-1" aria-label="Titre du chapitre" />
      <Button type="submit" disabled={pending}>
        {chapter ? "Enregistrer" : "Ajouter le chapitre"}
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function LessonForm({ chapterId, lesson, nextPosition, onDone }: { chapterId: string; lesson?: Lesson; nextPosition: number; onDone?: () => void }) {
  const [state, formAction, pending] = useResettingAction(saveLessonAction, onDone);
  return (
    <form key={state?.n ?? 0} action={formAction} className="space-y-2 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-slate-700">
      <input type="hidden" name="chapterId" value={chapterId} />
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      <div className="flex gap-2">
        <div className="w-20 shrink-0">
        <Input name="position" type="number" defaultValue={lesson?.position ?? nextPosition} aria-label="Numéro de la leçon" title="Numéro de la leçon" />
      </div>
        <Input name="title" defaultValue={lesson?.title} placeholder="Titre de la leçon" required className="min-w-0 flex-1" aria-label="Titre de la leçon" />
      </div>
      <Textarea name="content" defaultValue={lesson?.content ?? ""} rows={6} placeholder="Contenu de la leçon : objectifs, cours, exemples, exercices…" aria-label="Contenu de la leçon" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {lesson ? "Enregistrer la leçon" : "Ajouter la leçon"}
        </Button>
        {onDone && (
          <Button type="button" variant="secondary" onClick={onDone}>
            Fermer
          </Button>
        )}
      </div>
    </form>
  );
}

function LessonItem({ lesson, canEdit, chapterId }: { lesson: Lesson; canEdit: boolean; chapterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) return <LessonForm chapterId={chapterId} lesson={lesson} nextPosition={lesson.position} onDone={() => setEditing(false)} />;

  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-slate-800/60">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left text-sm font-medium text-zinc-900">
          {lesson.position}. {lesson.title}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            title={lesson.doneAt ? "Faite — toucher pour annuler" : "Marquer comme faite"}
            onClick={() =>
              start(async () => {
                await setLessonDoneAction(lesson.id, !lesson.doneAt);
                router.refresh();
              })
            }
            className={lesson.doneAt ? "text-emerald-600" : "text-zinc-300 hover:text-emerald-600"}
          >
            {lesson.doneAt ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
          </button>
          {canEdit && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="text-zinc-400 hover:text-zinc-700" aria-label="Modifier la leçon">
                <Pencil className="h-4 w-4" />
              </button>
              <ConfirmButton
                label={<Trash2 className="h-4 w-4" />}
                className="text-zinc-400 hover:text-red-600"
                confirmTitle="Supprimer la leçon"
                confirmMessage={`Supprimer « ${lesson.title} » ?`}
                action={() => deleteLessonAction(lesson.id)}
              />
            </>
          )}
        </div>
      </div>
      {open && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-slate-300">{lesson.content || "Pas de contenu."}</p>}
    </div>
  );
}

function ChapterCard({ chapter, classId, subjectId, canEdit }: { chapter: Chapter; classId: string; subjectId: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const nextLesson = (chapter.lessons.at(-1)?.position ?? 0) + 1;
  return (
    <Card>
      <CardBody className="space-y-3">
        {editing ? (
          <ChapterForm classId={classId} subjectId={subjectId} chapter={chapter} nextPosition={chapter.position} onDone={() => setEditing(false)} />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">
              Chapitre {chapter.position} — {chapter.title}
            </h2>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditing(true)} className="text-zinc-400 hover:text-zinc-700" aria-label="Modifier le chapitre">
                  <Pencil className="h-4 w-4" />
                </button>
                <ConfirmButton
                  label={<Trash2 className="h-4 w-4" />}
                  className="text-zinc-400 hover:text-red-600"
                  confirmTitle="Supprimer le chapitre"
                  confirmMessage={`Supprimer « ${chapter.title} » et toutes ses leçons ?`}
                  action={() => deleteChapterAction(chapter.id)}
                />
              </div>
            )}
          </div>
        )}
        {chapter.lessons.length === 0 && !adding && <p className="text-sm text-zinc-400">Aucune leçon dans ce chapitre.</p>}
        {chapter.lessons.map((l) => (
          <LessonItem key={l.id} lesson={l} canEdit={canEdit} chapterId={chapter.id} />
        ))}
        {canEdit &&
          (adding ? (
            <LessonForm chapterId={chapter.id} nextPosition={nextLesson} onDone={() => setAdding(false)} />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
              <Plus className="h-4 w-4" /> Ajouter une leçon
            </button>
          ))}
      </CardBody>
    </Card>
  );
}

export function LessonsBoard({ classId, subjectId, chapters, canEdit }: { classId: string; subjectId: string; chapters: Chapter[]; canEdit: boolean }) {
  const nextChapter = (chapters.at(-1)?.position ?? 0) + 1;
  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <CardBody>
            <ChapterForm classId={classId} subjectId={subjectId} nextPosition={nextChapter} />
          </CardBody>
        </Card>
      )}
      {chapters.length === 0 ? (
        <EmptyState title="Aucun chapitre" description={canEdit ? "Ajoutez le premier chapitre ci-dessus." : "La direction n'a pas encore écrit les leçons de cette matière."} />
      ) : (
        chapters.map((c) => <ChapterCard key={c.id} chapter={c} classId={classId} subjectId={subjectId} canEdit={canEdit} />)
      )}
    </div>
  );
}
