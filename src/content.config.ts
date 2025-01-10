import { z, defineCollection } from "astro:content";
import { glob } from 'astro/loaders';

const blogSchema = z.object({
    title: z.string(),
    description: z.string(), 
    pubDate: z.coerce.date(),
    updatedDate : z.string().optional(),
    heroImage: z.string().optional(),
});
    
const experienceSchema = z.object({
        title: z.string(),
        company: z.string(), 
        timeStart: z.coerce.date(),
        timeEnd : z.coerce.date().optional(),
    });
export type BlogSchema = z.infer<typeof blogSchema>;
export type ExperienceSchema = z.infer<typeof experienceSchema>;

const blogCollection = defineCollection( { schema : blogSchema, loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }) } ) ;
const experienceCollection = defineCollection( { schema : experienceSchema, loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/experience" }) } ) ;
const educationCollection = defineCollection( { schema : experienceSchema, loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/education" }) } ) ;

export const collections = {
    'blog' : blogCollection,
    'experience' : experienceCollection, 
    'education' : educationCollection,
}