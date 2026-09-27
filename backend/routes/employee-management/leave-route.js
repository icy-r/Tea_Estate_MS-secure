import { Router } from "express";
import * as RecruitmentController from "../../controllers/employee-management/leave-controller.js";
import { checkAuth, decodeUserFromToken } from "../../middleware/auth-mid.js";

const router = Router();

/*---------- Protected Routes ----------*/
// Every leave endpoint needs a logged-in user. Role and ownership checks live
// in the controller so HR can manage all requests while staff only touch their own.
router.use(decodeUserFromToken, checkAuth);

router.get("/", RecruitmentController.index);
router.get("/:id", RecruitmentController.show);
router.post("/", RecruitmentController.create);
router.put("/:id", RecruitmentController.update);
router.delete("/:id", RecruitmentController.destroy);

export { router };
