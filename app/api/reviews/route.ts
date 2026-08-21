import {NextRequest,NextResponse} from "next/server";
import {createReview,listReviews} from "@/lib/db";
export async function GET(){return NextResponse.json({reviews:listReviews(true)},{headers:{"Cache-Control":"no-store"}})}
export async function POST(req:NextRequest){try{const b=await req.json();const name=String(b.name||"").trim(),comment=String(b.comment||"").trim(),rating=Number(b.rating);if(!name||!comment||!Number.isInteger(rating)||rating<1||rating>5)return NextResponse.json({error:"Please enter your name, rating and review."},{status:400});const id=createReview(name,rating,comment);return NextResponse.json({ok:true,id})}catch{return NextResponse.json({error:"Could not save review."},{status:500})}}
