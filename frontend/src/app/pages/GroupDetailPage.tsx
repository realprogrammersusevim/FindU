import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Bell,
  BellOff,
  MapPin,
  Clock,
  Shield,
  Settings,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Crown,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CampusMap } from "../components/map/CampusMap";
import { useApp } from "../store/AppContext";
import type { DayOfWeek, GroupRule, LocationMode } from "../types";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function RuleEditor({
  rule,
  onUpdate,
  onDelete,
}: {
  rule: GroupRule;
  onUpdate: (r: GroupRule) => void;
  onDelete: () => void;
}) {
  const toggleDay = (d: DayOfWeek) => {
    const next = rule.days.includes(d)
      ? rule.days.filter((x) => x !== d)
      : [...rule.days, d];
    onUpdate({ ...rule, days: next });
  };

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <input
          value={rule.label}
          onChange={(e) => onUpdate({ ...rule, label: e.target.value })}
          className="text-xs font-semibold text-gray-800 bg-transparent outline-none flex-1"
        />
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Days */}
      <div className="flex gap-1">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => toggleDay(d)}
            className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-colors ${
              rule.days.includes(d)
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-400 border border-gray-200"
            }`}
          >
            {d[0]}
          </button>
        ))}
      </div>

      {/* Time range */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200 flex-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <input
            type="time"
            value={rule.startTime}
            onChange={(e) => onUpdate({ ...rule, startTime: e.target.value })}
            className="text-xs text-gray-700 outline-none bg-transparent"
          />
        </div>
        <span className="text-xs text-gray-400">to</span>
        <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200 flex-1">
          <input
            type="time"
            value={rule.endTime}
            onChange={(e) => onUpdate({ ...rule, endTime: e.target.value })}
            className="text-xs text-gray-700 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Location mode */}
      <div className="flex gap-1">
        {(["exact", "binary"] as LocationMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onUpdate({ ...rule, locationMode: m })}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
              rule.locationMode === m
                ? "bg-indigo-100 text-indigo-700"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            {m === "exact" ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
            {m === "exact" ? "Exact location" : "Binary only"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const {
    groups,
    geofences,
    friends,
    currentUser,
    toggleGroupAlerts,
    updateGroupRules,
    toggleGroupJoin,
    updateMemberRole,
    removeMember,
    disbandGroup,
  } = useApp();

  const group = groups.find((g) => g.id === groupId);
  const [tab, setTab] = useState<"members" | "rules" | "admin">("members");
  const [mapOpen, setMapOpen] = useState(true);

  if (!group) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">😕</div>
          <p className="text-gray-600">Group not found</p>
          <button
            onClick={() => navigate("/groups")}
            className="mt-3 text-indigo-600 text-sm"
          >
            ← Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = group.myRole === "admin";
  const groupFences = geofences.filter((f) => group.geofenceIds.includes(f.id));
  const fenceCenter = groupFences[0]?.center || currentUser.position;

  const handleAddRule = () => {
    const newRule: GroupRule = {
      id: `rule-${Date.now()}`,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "09:00",
      endTime: "17:00",
      locationMode: "exact",
      label: "New Rule",
    };
    updateGroupRules(group.id, [...group.rules, newRule]);
  };

  const handleUpdateRule = (updated: GroupRule) => {
    updateGroupRules(
      group.id,
      group.rules.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    updateGroupRules(
      group.id,
      group.rules.filter((r) => r.id !== ruleId)
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate("/groups")}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: `${group.color}20` }}
          >
            {group.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-gray-900">{group.name}</h2>
              {isAdmin && (
                <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">
                <Users className="w-3 h-3 inline mr-0.5" />
                {group.memberCount} members
              </span>
              <span className="text-xs text-green-600 font-semibold">
                · {group.activeCount} active now
              </span>
            </div>
          </div>
          <button
            onClick={() => toggleGroupAlerts(group.id)}
            className={`p-2 rounded-xl transition-colors ${
              group.alertsEnabled ? "bg-indigo-100" : "bg-gray-100"
            }`}
          >
            {group.alertsEnabled ? (
              <Bell className="w-4 h-4 text-indigo-600" />
            ) : (
              <BellOff className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Geofence active zones */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <MapPin className="w-3 h-3 text-gray-400" />
          {groupFences.map((f) => (
            <span
              key={f.id}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${f.color}20`, color: f.color }}
            >
              {f.icon} {f.name}
            </span>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(
            [
              { id: "members", label: "Members", icon: Users },
              { id: "rules", label: "Rules", icon: Clock },
              ...(isAdmin
                ? [{ id: "admin", label: "Admin", icon: Settings }]
                : []),
            ] as {
              id: string;
              label: string;
              icon: React.FC<{ className?: string }>;
            }[]
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map toggle */}
      <div className="bg-white border-b border-gray-100">
        <button
          onClick={() => setMapOpen(!mapOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5"
        >
          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            Group Zone Map
          </span>
          {mapOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <AnimatePresence>
          {mapOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 160 }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <CampusMap
                geofences={geofences}
                friends={friends}
                currentUser={currentUser}
                activeGeofenceIds={group.geofenceIds}
                centerOverride={fenceCenter}
                zoomOverride={15}
                height="160px"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Members tab */}
        {tab === "members" && (
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.userId}
                className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100"
              >
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.initials}
                  </div>
                  {member.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-800">
                      {member.name}
                    </span>
                    {member.role === "admin" && (
                      <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    )}
                    {member.role === "moderator" && (
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        member.withinGeofence
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {member.withinGeofence ? "✓ In zone" : "○ Outside zone"}
                    </span>
                    <span
                      className={`text-[10px] capitalize ${member.role === "admin" ? "text-amber-600 font-semibold" : member.role === "moderator" ? "text-indigo-600 font-semibold" : "text-gray-400"}`}
                    >
                      {member.role}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${member.isOnline ? "bg-green-500" : "bg-gray-300"}`}
                />
              </div>
            ))}

            {group.memberCount > group.members.length && (
              <div className="bg-gray-100 rounded-2xl p-4 text-center">
                <p className="text-xs text-gray-500">
                  +{group.memberCount - group.members.length} more members
                </p>
              </div>
            )}

            {!group.isJoined && (
              <button
                onClick={() => toggleGroupJoin(group.id)}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: group.color }}
              >
                Join Group to See All Members
              </button>
            )}
          </div>
        )}

        {/* Rules tab */}
        {tab === "rules" && (
          <div className="space-y-3">
            <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
              <p className="text-xs text-indigo-700 font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                How Rules Work
              </p>
              <p className="text-xs text-indigo-600">
                Admins can only see member locations within the group's geofence
                during active rule windows. Outside these hours, locations are
                automatically hidden.
              </p>
            </div>

            {group.rules.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">⏰</div>
                <p className="text-sm text-gray-500">No rules set yet</p>
                {isAdmin && (
                  <p className="text-xs text-gray-400 mt-1">
                    Add a rule to control when locations are visible
                  </p>
                )}
              </div>
            ) : (
              group.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {rule.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {rule.locationMode === "exact" ? (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Exact
                        </span>
                      ) : (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Binary
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {DAYS.map((d) => (
                      <span
                        key={d}
                        className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                          rule.days.includes(d)
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {d[0]}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {rule.startTime} – {rule.endTime}
                  </div>
                </div>
              ))
            )}

            {isAdmin && (
              <button
                onClick={handleAddRule}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            )}
          </div>
        )}

        {/* Admin tab */}
        {tab === "admin" && isAdmin && (
          <div className="space-y-4">
            {/* Rule editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Edit Rules
                </span>
                <button
                  onClick={handleAddRule}
                  className="flex items-center gap-1 text-xs text-indigo-600 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {group.rules.map((rule) => (
                  <RuleEditor
                    key={rule.id}
                    rule={rule}
                    onUpdate={handleUpdateRule}
                    onDelete={() => handleDeleteRule(rule.id)}
                  />
                ))}
                {group.rules.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">
                    No rules — add one above
                  </p>
                )}
              </div>
            </div>

            {/* Member management */}
            <div>
              <span className="text-sm font-semibold text-gray-700 block mb-2">
                Member Management
              </span>
              <div className="space-y-2">
                {group.members.map((m) => (
                  <div
                    key={m.userId}
                    className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      {m.initials}
                    </div>
                    <span className="flex-1 text-sm text-gray-800">
                      {m.name}
                    </span>
                    <select
                      value={m.role}
                      className="text-xs bg-gray-100 rounded-lg px-2 py-1 outline-none text-gray-600"
                      onChange={(e) =>
                        updateMemberRole(
                          group.id,
                          m.userId,
                          e.target.value as "admin" | "moderator" | "member"
                        )
                      }
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    {m.userId !== currentUser.id && (
                      <button
                        onClick={() => removeMember(group.id, m.userId)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-sm font-semibold text-red-700 mb-2">
                Danger Zone
              </p>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Disband "${group.name}"? This cannot be undone.`
                    )
                  ) {
                    disbandGroup(group.id).then(() => navigate("/groups"));
                  }
                }}
                className="w-full py-2 bg-red-100 text-red-700 text-xs font-semibold rounded-xl hover:bg-red-200 transition-colors"
              >
                Disband Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
