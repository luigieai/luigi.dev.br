import { z, defineCollection } from "astro:content";

const testSchema = z.object({
        nome: z.string(),
        lista: z.array(z.string()),
        data: z.string().transform(str => new Date(str)),
    }); 

const testCollection = defineCollection( { schema : testSchema } ) ;

export const collections = {
    'test' : testCollection,
}