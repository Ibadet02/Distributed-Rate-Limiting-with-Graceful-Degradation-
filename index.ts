import express, { NextFunction, Request, Response } from "express";
import fetch from "node-fetch";
import RedisMock from "ioredis-mock";

const redis = new RedisMock();

const app = express();

async function getRepos(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("Fetching data...");

    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json() as Record<string, string>;

    console.log(data.public_repos)

    res.status(200).send(data);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

app.get("/repos/:username", getRepos);

app.listen(3000, () => {
  console.log(`Listening to port 3000`);
});
