import { Router } from "express";
import * as RecruitmentController  from "../../controllers/employee-management/applicant-controller.js";
import { decodeUserFromToken, requireRole } from "../../middleware/auth-mid.js";



const router = Router();

/*---------- Public Routes ----------*/


/*---------- Protected Routes ----------*/
router.use(decodeUserFromToken)
const hr = requireRole("Employee Manager")
// index for getting all machines defined in RecruitmentController
router.get("/", hr, RecruitmentController.index);

// show for getting a single machine defined in RecruitmentController
router.get("/:id", hr, RecruitmentController.show);

// create for creating a new machine defined in RecruitmentController
router.post("/", RecruitmentController.create);

// update for updating a machine defined in RecruitmentController
router.put("/:id", hr, RecruitmentController.update);

// destroy for deleting a machine defined in RecruitmentController
router.delete("/:id", hr, RecruitmentController.destroy);


export { router };