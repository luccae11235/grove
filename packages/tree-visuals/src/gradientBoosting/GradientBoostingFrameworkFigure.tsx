import { useId } from "react";
import styles from "./GradientBoosting.module.css";
import { isPt, type GradientBoostingLocale } from "./locale";

const LOSSES_EN = [
  {
    task: "Regression",
    loss: "squared error",
    formula: "L = ½(y − F)²",
    signal: "−∂L/∂F = y − F",
  },
  {
    task: "Binary class · p = σ(F)",
    loss: "binary log loss",
    formula: "L = −y log p − (1−y) log(1−p)",
    signal: "−∂L/∂F = y − p",
  },
  {
    task: "Counts · μ = exp(F)",
    loss: "Poisson loss",
    formula: "L = exp(F) − yF + const(y)",
    signal: "−∂L/∂F = y − μ",
  },
  {
    task: "Many classes · p = softmax(F)",
    loss: "cross-entropy",
    formula: "L = −Σₖ yₖ log pₖ",
    signal: "−∂L/∂Fₖ = yₖ − pₖ",
  },
] as const;

const LOSSES_PT = [
  {
    task: "Regressão",
    loss: "erro quadrático",
    formula: "L = ½(y − F)²",
    signal: "−∂L/∂F = y − F",
  },
  {
    task: "Classe binária · p = σ(F)",
    loss: "log loss binária",
    formula: "L = −y log p − (1−y) log(1−p)",
    signal: "−∂L/∂F = y − p",
  },
  {
    task: "Contagens · μ = exp(F)",
    loss: "loss de Poisson",
    formula: "L = exp(F) − yF + const(y)",
    signal: "−∂L/∂F = y − μ",
  },
  {
    task: "Muitas classes · p = softmax(F)",
    loss: "entropia cruzada",
    formula: "L = −Σₖ yₖ log pₖ",
    signal: "−∂L/∂Fₖ = yₖ − pₖ",
  },
] as const;

export function GradientBoostingFrameworkFigure({ locale = "en" }: { locale?: GradientBoostingLocale }) {
  const descriptionId = useId();
  const pt = isPt(locale);
  const losses = pt ? LOSSES_PT : LOSSES_EN;

  return (
    <figure className={styles.figure} data-gradient-boosting-figure="gradient-framework">
      <div
        className={`${styles.figureFrame} ${styles.frameworkFigure}`}
        role="img"
        aria-describedby={descriptionId}
      >
        <div className={styles.frameworkHeader}>
          <strong>{pt ? "Um único mecanismo de boosting" : "One boosting engine"}</strong>
          <span>{pt ? "a loss fornece o alvo da correção" : "the loss supplies the correction target"}</span>
        </div>

        <div className={styles.lossChoices} aria-hidden="true">
          {losses.map((item) => (
            <div className={styles.lossChoice} key={item.task}>
              <span>{item.task}</span>
              <strong>{item.loss}</strong>
              <b>{item.formula}</b>
              <small><em>{pt ? "alvo da árvore" : "tree target"}</em>{item.signal}</small>
            </div>
          ))}
        </div>

        <div className={styles.frameworkFlow} aria-hidden="true">
          <div className={styles.frameworkStep}>
            <span>{pt ? "1 · consulte a loss" : "1 · ask the loss"}</span>
            <strong>gᵢₘ = −∂L / ∂F</strong>
            <small>{pt ? "um alvo para cada linha de treino" : "one target for each training row"}</small>
          </div>
          <span className={styles.frameworkArrow}>→</span>
          <div className={styles.frameworkStep}>
            <span>{pt ? "2 · ajuste uma árvore pequena" : "2 · fit a small tree"}</span>
            <strong>hₘ(xᵢ) ≈ gᵢₘ</strong>
            <small>{pt ? "generalize entre os inputs" : "generalize across inputs"}</small>
          </div>
          <span className={styles.frameworkArrow}>→</span>
          <div className={styles.frameworkStep}>
            <span>{pt ? "3 · adicione a correção" : "3 · add the correction"}</span>
            <strong>Fₘ = Fₘ₋₁ + ηhₘ</strong>
            <small>{pt ? "repita com o novo modelo" : "repeat with the new model"}</small>
          </div>
        </div>

        <p className={styles.frameworkReturn} aria-hidden="true">
          <span>↖</span> {pt ? "o novo score muda o alvo da próxima árvore" : "the new score changes the next tree target"}
        </p>

        <p className={styles.srOnly} id={descriptionId}>
          {pt
            ? "O gradient boosting usa o mesmo mecanismo de três passos em várias tarefas. A loss escolhida define uma direção desejada em cada predição. Uma árvore pequena aprende essa direção como função dos inputs. A árvore escalada é adicionada ao modelo atual, e o ciclo se repete. A regressão com erro quadrático usa y menos F. A log loss binária usa y menos p, em que p é a sigmoid de F. A loss de Poisson com função de ligação log usa y menos mu, em que mu é exp de F. A entropia cruzada multiclasse usa y índice k menos p índice k para cada classe, em que o vetor de probabilidades é o softmax do vetor de scores."
            : "Gradient boosting uses the same three-step engine for several tasks. The chosen loss defines a desired direction at each prediction. A small tree learns that direction as a function of the inputs. The scaled tree is added to the current model, and the cycle repeats. Squared-error regression uses y minus F. Binary log loss uses y minus p, where p is sigmoid of F. Poisson loss with a log link uses y minus mu, where mu is exp of F. Multiclass cross-entropy uses y sub k minus p sub k for each class, where the probability vector is the softmax of the score vector."}
        </p>
      </div>
      <figcaption>
        {pt
          ? "Mude a loss, e o alvo da correção muda. O mecanismo de ajustar e adicionar permanece o mesmo."
          : "Change the loss and the correction target changes. The fit-and-add engine stays the same."}
      </figcaption>
    </figure>
  );
}
