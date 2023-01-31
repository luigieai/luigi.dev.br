import { z, defineCollection } from "astro:content";

const blogSchema = z.object({
    title: z.string(),
    description: z.string(), 
    pubDate: z.coerce.date(),
    updatedDate : z.string().optional(),
    heroImage: z.string().optional(),
});
const testSchema = z.object({
        nome: z.string(),
        lista: z.array(z.string()),
        data: z.string().transform(str => new Date(str)),
    });
    
export type SchemaTest = z.infer<typeof testSchema>;
export type BlogSchema = z.infer<typeof blogSchema>;

const testCollection = defineCollection( { schema : testSchema } ) ;
const blogCollection = defineCollection( { schema : blogSchema } ) ;

export const collections = {
    'blog' : blogCollection,
    'test' : testCollection,
}