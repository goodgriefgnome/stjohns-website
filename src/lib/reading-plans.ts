// The Bible reading plans in imported/reading-plans (one file per year), and the one to show on the build day.
import snapshot from '../../imported/snapshot.json';
import { currentPlan } from './reading-plan.mjs';

export interface ReadingDay { date: string; readings: (string | null)[] }
export interface ReadingVersion { id: string; name: string; summary: string; streams: string[]; days: ReadingDay[] }
export interface ReadingPlan { id: string; title: string; pdf: string; versions: ReadingVersion[] }

const files = import.meta.glob<{ default: Omit<ReadingPlan, 'id'> }>('../../imported/reading-plans/*.json', { eager: true });
const plans: ReadingPlan[] = Object.entries(files).map(([path, file]) => ({ id: path.split('/').at(-1)!.replace('.json', ''), ...file.default }));

/** The build day in the church's time zone. */
export const buildDay = new Intl.DateTimeFormat('en-CA', { timeZone: snapshot.timezone }).format(new Date());
export const timeZone = snapshot.timezone;

export const plan: ReadingPlan = currentPlan(plans, buildDay);
