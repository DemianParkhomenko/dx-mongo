import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { resolve } from "path";
import * as TJS from "typescript-json-schema";
import { User } from "./User";

const uri = process.env.URI || "mongodb://localhost:27017";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    await client.close();
  }
}
run().catch(console.dir);

const settings: TJS.PartialArgs = {
  required: true,
};

const compilerOptions: TJS.CompilerOptions = {
  strictNullChecks: true,
};

const program = TJS.getProgramFromFiles([resolve("user.ts")], compilerOptions);
const schema = TJS.generateSchema(program, "User", settings);

if (!schema) {
  console.error("Schema is undefined");
  process.exit(1);
}
console.log("Schema: ", schema);
delete schema.$schema;
delete schema.$ref;

(async () => {
  const db = client.db("testSchemas");

  const collections = await db.listCollections().toArray();
  const exists = collections.some((col) => col.name === "users");

  if (!exists) {
    const collection = await db.createCollection<User>("users", {
      validator: { $jsonSchema: schema },
    });
  } else {
    console.log("Collection 'users' already exists");
  }

  // Assuming you want to insert data whether the collection was newly created or already existed
  const collection = db.collection<User>("users");
  await collection.insertOne({
    address: "123 Fake St.",
    age: "123" as any,
    name: "John Doe",
  });
})();
