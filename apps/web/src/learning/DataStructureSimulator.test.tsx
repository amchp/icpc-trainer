import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { DataStructureSimulator, type DataStructureSimulatorKind } from "./DataStructureSimulator.js";

function renderSimulator(kind: DataStructureSimulatorKind) {
  render(<DataStructureSimulator kind={kind} accent="cyan" />);
  return screen.getByRole("region", { name: `Interactive ${kind === "struct" ? "a Counter struct" : kind} simulator` });
}

function selectOperation(simulator: HTMLElement, name: string): void {
  fireEvent.click(within(simulator).getByRole("button", { name }));
}

function setNumber(simulator: HTMLElement, name: string, value: string): void {
  fireEvent.change(within(simulator).getByRole("textbox", { name }), { target: { value } });
}

function runOperation(simulator: HTMLElement): void {
  fireEvent.click(within(simulator).getByRole("button", { name: "Run operation" }));
}

describe("DataStructureSimulator", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage("en");
  });

  it("starts every simulator with a useful numeric initialization", () => {
    const cases: ReadonlyArray<{
      readonly kind: DataStructureSimulatorKind;
      readonly code: string;
      readonly state: RegExp;
    }> = [
      { kind: "vector", code: "vector<int> values = {8, 3, 5};", state: /8.*3.*5/ },
      { kind: "stack", code: "stack<int> pile(deque<int>{2, 7, 4});", state: /4.*7.*2/ },
      { kind: "queue", code: "queue<int> line(deque<int>{12, 24, 36});", state: /12.*24.*36/ },
      { kind: "deque", code: "deque<int> deck = {3, 8, 13};", state: /3.*8.*13/ },
      { kind: "set", code: "set<int> numbers = {3, 7, 11};", state: /3.*7.*11/ },
      { kind: "map", code: "map<int, int> scores = {{1, 10}, {3, 30}, {7, 70}};", state: /1.*10.*3.*30.*7.*70/ },
      { kind: "struct", code: "visits.add(5);", state: /5/ }
    ];

    for (const entry of cases) {
      const simulator = renderSimulator(entry.kind);
      expect(within(simulator).getByLabelText("Initialization and executed code")).toHaveTextContent(entry.code);
      expect(within(simulator).getByRole("region", { name: "Container state" })).toHaveTextContent(entry.state);
      cleanup();
    }
  });

  it("keeps the C++ template fixed and accepts only a number inside its parentheses", () => {
    const vector = renderSimulator("vector");
    const number = within(vector).getByRole("textbox", { name: "Number" });
    const preview = within(vector).getByLabelText("C++ line preview");

    expect(number).toHaveValue("13");
    expect(preview).toHaveTextContent("values.push_back(");
    expect(preview).toHaveTextContent(");");
    expect(within(vector).queryByRole("textbox", { name: "Next C++ statement" })).not.toBeInTheDocument();
    expect(within(vector).getByLabelText("Initialization and executed code")).not.toHaveTextContent("values.push_back(13);");

    setNumber(vector, "Number", "letters");
    expect(number).toHaveValue("13");
    setNumber(vector, "Number", "21");
    runOperation(vector);

    expect(within(vector).getByRole("region", { name: "Container state" })).toHaveTextContent(/8.*3.*5.*21/);
    expect(within(vector).getByLabelText("Initialization and executed code")).toHaveTextContent("values.push_back(21);");
  });

  it("executes stack, queue, and deque operations against their preloaded state", () => {
    const stack = renderSimulator("stack");
    selectOperation(stack, "top()");
    runOperation(stack);
    expect(within(stack).getByLabelText("Last query result")).toHaveTextContent("4");
    selectOperation(stack, "push(number)");
    setNumber(stack, "Number", "9");
    runOperation(stack);
    selectOperation(stack, "top()");
    runOperation(stack);
    expect(within(stack).getByLabelText("Last query result")).toHaveTextContent("9");
    cleanup();

    const queue = renderSimulator("queue");
    selectOperation(queue, "front()");
    runOperation(queue);
    expect(within(queue).getByLabelText("Last query result")).toHaveTextContent("12");
    selectOperation(queue, "pop()");
    runOperation(queue);
    selectOperation(queue, "front()");
    runOperation(queue);
    expect(within(queue).getByLabelText("Last query result")).toHaveTextContent("24");
    selectOperation(queue, "push(number)");
    setNumber(queue, "Number", "48");
    runOperation(queue);
    expect(within(queue).getByRole("region", { name: "Container state" })).toHaveTextContent(/24.*36.*48/);
    cleanup();

    const deque = renderSimulator("deque");
    selectOperation(deque, "push_front(number)");
    setNumber(deque, "Number", "2");
    runOperation(deque);
    selectOperation(deque, "deck[index]");
    setNumber(deque, "Index number", "1");
    runOperation(deque);
    expect(within(deque).getByLabelText("Last query result")).toHaveTextContent("3");
  });

  it("keeps set and numeric map ordering while generating valid repeated iterator names", () => {
    const set = renderSimulator("set");
    selectOperation(set, "insert(number)");
    setNumber(set, "Number", "9");
    runOperation(set);
    expect(within(set).getByRole("region", { name: "Container state" })).toHaveTextContent(/3.*7.*9.*11/);
    selectOperation(set, "lower_bound(number)");
    setNumber(set, "Number", "5");
    runOperation(set);
    expect(within(set).getByLabelText("Last query result")).toHaveTextContent("iterator → 7");
    cleanup();

    const map = renderSimulator("map");
    selectOperation(map, "emplace(key, value)");
    setNumber(map, "Key number", "5");
    setNumber(map, "Value number", "50");
    runOperation(map);
    expect(within(map).getByRole("region", { name: "Container state" })).toHaveTextContent(/1.*10.*3.*30.*5.*50.*7.*70/);

    selectOperation(map, "lower_bound(key)");
    setNumber(map, "Key number", "4");
    runOperation(map);
    runOperation(map);
    expect(within(map).getByLabelText("Last query result")).toHaveTextContent("iterator → {5, 50}");
    expect(within(map).getByLabelText("Initialization and executed code")).toHaveTextContent("auto result3 = scores.lower_bound(4);");
    expect(within(map).getByLabelText("Initialization and executed code")).toHaveTextContent("auto result4 = scores.lower_bound(4);");
  });

  it("shows clear validation and reset returns to the prepared example", () => {
    const vector = renderSimulator("vector");
    selectOperation(vector, "values[index]");
    setNumber(vector, "Index number", "-1");
    runOperation(vector);
    expect(within(vector).getByRole("alert")).toHaveTextContent("outside the container");

    setNumber(vector, "Index number", "99");
    runOperation(vector);
    expect(within(vector).getByRole("alert")).toHaveTextContent("outside the container");
    expect(within(vector).getByLabelText("Initialization and executed code")).not.toHaveTextContent("values[99]");

    selectOperation(vector, "push_back(number)");
    setNumber(vector, "Number", "21");
    runOperation(vector);
    fireEvent.click(within(vector).getByRole("button", { name: "Reset" }));
    expect(within(vector).getByRole("region", { name: "Container state" })).toHaveTextContent(/8.*3.*5/);
    expect(within(vector).getByLabelText("Initialization and executed code")).not.toHaveTextContent("values.push_back(21)");
    expect(within(vector).getByRole("textbox", { name: "Number" })).toHaveValue("13");
  });

  it("starts the Counter at five and localizes its fixed numeric operation", async () => {
    const counter = renderSimulator("struct");
    setNumber(counter, "Number", "3");
    runOperation(counter);
    expect(within(counter).getByRole("region", { name: "Container state" })).toHaveTextContent("8");
    cleanup();

    await i18n.changeLanguage("es");
    render(<DataStructureSimulator kind="struct" accent="cyan" />);
    const spanish = screen.getByRole("region", { name: "Simulador interactivo de una struct Contador" });
    expect(within(spanish).getByLabelText("Inicialización y código ejecutado")).toHaveTextContent("visitas.agregar(5);");
    setNumber(spanish, "Número", "4");
    fireEvent.click(within(spanish).getByRole("button", { name: "Ejecutar operación" }));
    expect(within(spanish).getByRole("region", { name: "Estado del contenedor" })).toHaveTextContent("9");
  });

  it("starts a clean prepared session when the language changes live", async () => {
    const { rerender } = render(<DataStructureSimulator kind="stack" accent="cyan" />);
    const english = screen.getByRole("region", { name: "Interactive stack simulator" });
    setNumber(english, "Number", "9");
    runOperation(english);

    await i18n.changeLanguage("es");
    rerender(<DataStructureSimulator kind="stack" accent="cyan" />);
    const spanish = await screen.findByRole("region", { name: "Simulador interactivo de stack" });
    expect(within(spanish).getByLabelText("Inicialización y código ejecutado")).toHaveTextContent("stack<int> pila(deque<int>{2, 7, 4});");
    expect(within(spanish).getByLabelText("Inicialización y código ejecutado")).not.toHaveTextContent("pile.push(9)");
    expect(within(spanish).getByRole("region", { name: "Estado del contenedor" })).toHaveTextContent(/4.*7.*2/);
    expect(within(spanish).getByRole("textbox", { name: "Número" })).toHaveValue("9");
  });
});
