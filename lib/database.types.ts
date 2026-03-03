export type Database = {
    "public": {
        "Tables": {
            "users": {
                "Row": {
                    "id": "uuid",
                    "email": "text",
                    "phone": "text",
                    "is_admin": "boolean",
                    "full_name": "text",
                    "last_name": "text",
                    "avatar_url": "text",
                    "created_at": "timestamp with time zone",
                    "first_name": "text",
                    "resume_url": "text",
                    "designation": "text",
                    "package_tier": "character varying",
                    "primary_role": "text",
                    "current_company": "text",
                    "display_pic_url": "text",
                    "available_sessions": "integer",
                    "negotiation_credits": "integer",
                    "onboarding_complete": "boolean",
                    "total_sessions_used": "integer"
                }
            },
            "sessions": {
                "Row": {
                    "id": "uuid",
                    "status": "text",
                    "clarity": "integer",
                    "pdf_url": "text",
                    "user_id": "uuid",
                    "recovery": "integer",
                    "structure": "integer",
                    "created_at": "timestamp with time zone",
                    "evaluation": "jsonb",
                    "transcript": "text",
                    "key_insight": "text",
                    "scenario_id": "integer",
                    "session_type": "text",
                    "signal_noise": "integer",
                    "answer_upgrades": "jsonb",
                    "evaluation_data": "jsonb",
                    "risk_projection": "text",
                    "confidence_score": "double precision",
                    "duration_seconds": "integer",
                    "evaluation_depth": "text",
                    "pattern_analysis": "text",
                    "family_selections": "jsonb",
                    "replay_comparison": "jsonb",
                    "custom_scenario_id": "uuid",
                    "framework_contrast": "text",
                    "readiness_assessment": "text",
                    "replay_of_session_id": "uuid",
                    "alternative_approaches": "ARRAY",
                    "improvement_priorities": "ARRAY"
                }
            },
            "purchases": {
                "Row": {
                    "id": "integer",
                    "amount": "integer",
                    "status": "character varying",
                    "user_id": "uuid",
                    "order_id": "text",
                    "created_at": "timestamp with time zone",
                    "sessions_added": "integer"
                }
            },
            "scenarios": {
                "Row": {
                    "id": "integer",
                    "role": "character varying",
                    "level": "character varying",
                    "prompt": "text",
                    "persona": "character varying",
                    "is_active": "boolean",
                    "created_at": "timestamp with time zone",
                    "created_by": "uuid",
                    "difficulty": "character varying",
                    "scenario_type": "character varying",
                    "scenario_title": "text",
                    "company_context": "text",
                    "seeded_questions": "jsonb",
                    "applicant_context": "text",
                    "base_system_prompt": "text",
                    "interviewer_persona": "jsonb",
                    "scenario_description": "text",
                    "evaluation_dimensions": "ARRAY"
                }
            },
            "admin_logs": {
                "Row": {
                    "id": "uuid",
                    "action": "text",
                    "details": "jsonb",
                    "admin_id": "uuid",
                    "target_id": "text",
                    "created_at": "timestamp with time zone",
                    "target_resource": "text"
                }
            },
            "notifications": {
                "Row": {
                    "id": "uuid",
                    "type": "text",
                    "status": "USER-DEFINED",
                    "channel": "USER-DEFINED",
                    "user_id": "uuid",
                    "metadata": "jsonb",
                    "created_at": "timestamp with time zone"
                }
            },
            "system_errors": {
                "Row": {
                    "id": "uuid",
                    "details": "jsonb",
                    "message": "text",
                    "user_id": "uuid",
                    "category": "text",
                    "created_at": "timestamp with time zone",
                    "session_id": "text"
                }
            },
            "support_issues": {
                "Row": {
                    "id": "uuid",
                    "status": "text",
                    "user_id": "uuid",
                    "created_at": "timestamp with time zone",
                    "issue_type": "text",
                    "session_id": "text",
                    "description": "text",
                    "browser_info": "text"
                }
            },
            "interview_turns": {
                "Row": {
                    "id": "uuid",
                    "content": "text",
                    "answered": "boolean",
                    "turn_type": "text",
                    "created_at": "timestamp with time zone",
                    "session_id": "uuid",
                    "turn_index": "integer"
                }
            },
            "system_settings": {
                "Row": {
                    "key": "text",
                    "value": "jsonb",
                    "updated_at": "timestamp with time zone",
                    "updated_by": "uuid"
                }
            },
            "custom_scenarios": {
                "Row": {
                    "id": "uuid",
                    "title": "text",
                    "user_id": "uuid",
                    "created_at": "timestamp with time zone",
                    "company_context": "text",
                    "base_scenario_id": "integer",
                    "focus_dimensions": "ARRAY"
                }
            },
            "question_families": {
                "Row": {
                    "id": "text",
                    "dimension": "text",
                    "created_at": "timestamp without time zone",
                    "family_name": "text",
                    "prompt_guidance": "text"
                }
            },
            "user_family_usage": {
                "Row": {
                    "id": "uuid",
                    "used_at": "timestamp without time zone",
                    "user_id": "uuid",
                    "dimension": "text",
                    "family_id": "text"
                }
            },
            "users_pro_plus_backup": {
                "Row": {
                    "id": "uuid",
                    "email": "text",
                    "created_at": "timestamp with time zone",
                    "package_tier": "character varying",
                    "available_sessions": "integer",
                    "total_sessions_used": "integer"
                }
            }
        }
    }
};