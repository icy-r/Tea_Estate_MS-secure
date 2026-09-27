import { Router } from "express";
import * as RecruitmentController  from "../../controllers/employee-management/leave-controller.js";
import {checkAuth, decodeUserFromToken} from "../../middleware/auth-mid.js";



const router = Router();

/*---------- Public Routes ----------*/


/*---------- Protected Routes ----------*/
// Every leave endpoint needs a login; who may see or change which request
// (owner vs Employee Manager) is checked in the controller.
router.use(decodeUserFromToken, checkAuth)
// index for getting all machines defined in RecruitmentController
router.get("/", RecruitmentController.index);

// show for getting a single machine defined in RecruitmentController
router.get("/:id", RecruitmentController.show);

// create for creating a new machine defined in RecruitmentController
router.post("/", RecruitmentController.create);

// update for updating a machine defined in RecruitmentController
router.put("/:id",  RecruitmentController.update);

// destroy for deleting a machine defined in RecruitmentController
router.delete("/:id", RecruitmentController.destroy);


export { router };