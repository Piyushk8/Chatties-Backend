import {socketIds } from "../app.js"
import { db } from "../drizzle/migrate.js"
import { chatMembers } from "../drizzle/schema.js"
import { getSocketIds } from "./helper.js"
export const getMyFriendsSockets = async(userId:string)=>{
    console.log(userId)
   
    }