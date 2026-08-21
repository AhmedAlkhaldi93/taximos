import Home from "./home";import {getSettings} from "@/lib/db";export const dynamic="force-dynamic";export default function Page(){return <Home settings={getSettings()}/>}
