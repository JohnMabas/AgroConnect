import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  getMessagesHandler,
  getMyLanguageHandler,
  listLanguagesHandler,
  updateMyLanguageHandler,
} from "./localization.controller.js";

export function createLocalizationRouter(): Router {
  const router = Router();

  router.get("/languages", listLanguagesHandler);
  router.get("/messages", getMessagesHandler);

  router.get("/me", authenticate, getMyLanguageHandler);
  router.put("/me", authenticate, updateMyLanguageHandler);

  return router;
}
